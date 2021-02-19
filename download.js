const https = require('https');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const download_from_google_drive = function (p_path, p_file_id, p_on_success, p_on_error) {
    const file = fs.createWriteStream(p_path);
    https.get(`https://drive.google.com/uc?export=download&id=${p_file_id}`, (res) => {
        let l_body = "";
        res.on("data", (p_body) => {
            l_body += p_body.toString();
        });
        res.on("end", () => {
            let l_start_index = l_body.indexOf("https:");
            let l_end_index = l_body.indexOf("\"", l_start_index);
            let l_download_url = l_body.slice(l_start_index, l_end_index);

            https.get(l_download_url, (res) => {
                res.pipe(file);
                file.on("finish", () => {
                    file.close();
                    if (p_on_success) {
                        p_on_success();
                    }
                })
            }).on("error", (err) => {
                console.error(err);
                if (p_on_error) {
                    p_on_error(err);
                }
            });

        }).on("error", (err) => {
            console.error(err);
            if (p_on_error) {
                p_on_error(err);
            }
        });
    });
};

const download_instance = {
    file_id: "",
    relative_extract_path: ""
};

const zip_temp_folder_path = path.join(__dirname, "./.tmp");
const zip_temp_file_path = path.join(zip_temp_folder_path, "./zip.7z");

const close_app = function () {
    fs.rmdirSync(zip_temp_folder_path, {recursive: true});
};

fs.mkdir(zip_temp_folder_path, {recursive: true}, (err) => {
    if (err) {
        console.error(err);
        close_app();
        return;
    }

    fs.readFile(path.join(__dirname, "./zip_download.json"), (err, data) => {
        if (err) {
            console.error(err);
            close_app();
            return;
        }

        let l_download_configuration = JSON.parse(data);

        let l_index = 0;

        const foreach_func = function () {
            if (l_index < l_download_configuration.length) {
                let l_download_instance = l_download_configuration[l_index];

                if (l_download_instance.relative_extract_path.indexOf("../") !== -1) {
                    console.error("A path contains, '../', this is forbidden.");
                    close_app();
                    return;
                }
                if(__dirname === path.join(__dirname, l_download_instance.relative_extract_path))
                {
                    console.error("Cannot extract to root");
                    close_app();
                    return;
                }

                download_from_google_drive(zip_temp_file_path, l_download_instance.file_id, () => {

                    fs.rmdir(path.join(__dirname, l_download_instance.relative_extract_path), {recursive: true}, (err) => {
                        if (err) {
                            console.error(error);
                            close_app();
                            return;
                        }
                        fs.mkdir(path.join(__dirname, l_download_instance.relative_extract_path), {recursive: true}, (err) => {
                            if (err) {
                                console.error(error);
                                close_app();
                                return;
                            }

                            child_process.exec(`7z x ${zip_temp_file_path} -o${path.join(__dirname, l_download_instance.relative_extract_path)}`, {}, (error, stdout, stderr) => {
                                if (error) {
                                    console.error(error);
                                    close_app();
                                    return;
                                }
                                l_index += 1;
                                foreach_func();
                            });

                        });
                    });

                }, () => {
                    close_app();
                });
            }
            else {
                close_app();
            }
        };

        foreach_func();
    });
})

// "1UY90XLx5J0ABUilpkB2fOQHQD_qrnvtI"

