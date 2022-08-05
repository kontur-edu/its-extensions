import * as fs from "fs";
import archiver from "archiver";

const defaultParams = {
  server_url: "",
  function_id: "",
  bucket_name: "",
};
// console.log(fs);

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export async function prepareApiGatewaySpec(fname, params) {
  let data = await fs.promises.readFile(fname, "utf8");
  console.log(data);

  for (const key in params) {
    let escaped = escapeRegExp(`{{${key}}}`);
    let re = new RegExp(escaped, "g");
    data = data.replace(re, params[key]);
  }

  console.log(data);
  const timestamp = Date.now();
  const newFileName = `${timestamp}_${fname}`;
  await fs.promises.writeFile(newFileName, data);
  return newFileName;
}

export async function deleteFile(fname) {
  await fs.promises.unlink(fname);
}

export function zipFiles(archiveFilename, src_dir, filenames) {
  return new Promise((resolve, reject) => {
    let output = fs.createWriteStream(archiveFilename);
    let archive = archiver("zip");

    output.on("close", function () {
      console.log(archive.pointer() + " total bytes");
      console.log(
        "archiver has been finalized and the output file descriptor has closed."
      );
      resolve(archive.pointer());
    });

    archive.on("error", function (err) {
      reject();
    });

    archive.pipe(output);
    const paths = filenames.map((fname) => `${src_dir}/${fname}`);
    for (let i = 0; i < filenames.length; i++) {
      archive = archive.append(fs.createReadStream(paths[i]), {
        name: filenames[i],
      });
    }
    archive.finalize();
  });
}
