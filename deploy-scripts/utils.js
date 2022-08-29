import * as fs from "fs";
import archiver from "archiver";
import * as child_process from "node:child_process";

export const defaultParams = {
  server_url: "placeholder",
  function_id: "placeholder",
  notion_function_id: "placeholder",
  bucket_name: "placeholder",
  website_dir: "website",
};

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function prepareApiGatewaySpec(fname, params) {
  console.log(`prepareApiGatewaySpec: ${fname} params: `, params);
  let data = await fs.promises.readFile(fname, "utf8");

  for (const key in params) {
    let escaped = escapeRegExp(`{{${key}}}`);
    let re = new RegExp(escaped, "g");
    data = data.replace(re, params[key]);
  }

  const timestamp = Date.now();
  const newFileName = `${timestamp}_${fname}`;
  await fs.promises.writeFile(newFileName, data);
  return { preparedSpecFilename: newFileName, content: data };
}

export async function deleteFile(fname) {
  console.log(`deleteFile: ${fname}`);
  await fs.promises.unlink(fname);
}

export function zipFiles(archiveFilename, src_dir, filenames) {
  console.log(`zipFiles ${archiveFilename}, ${src_dir}, ${filenames}`);
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

function execCommand(command) {
  return new Promise((resolve, reject) => {
    child_process.exec(command, (error, stdout, stderr) => {
      console.log(`command: ${command}`);
      resolve({ error, stdout, stderr });
    });
  });
}

async function execCommandAndGetField(command, key) {
  const res = await execCommand(command);
  let re = new RegExp(`${key}:\\s+([\\w\\.-]+)\\n`, "i");
  const m = res.stdout.match(re);
  if (m && m.length > 1) {
    return m[1];
  }
  return null;
}

export async function getFunctionId(fname) {
  console.log(`getFunctionId: ${fname}`);
  return execCommandAndGetField(`yc serverless function get ${fname}`, "id");
}

export async function createFunction(fname) {
  console.log(`createFunction: ${fname}`);
  return execCommandAndGetField(`yc serverless function create ${fname}`, "id");
}

export async function makeFunctionPublic(fname) {
  console.log(`makeFunctionPublic: ${fname}`);
  return execCommandAndGetField(
    `yc serverless function allow-unauthenticated-invoke ${fname}`,
    ""
  );
}

export async function getApiGateWayDomain(apiGatewayName) {
  console.log(`getApiGateWayDomain: ${apiGatewayName}`);
  return execCommandAndGetField(
    `yc serverless api-gateway get ${apiGatewayName}`,
    "domain"
  );
}

export async function createApiGateway(apiGatewayName, specFilename) {
  console.log(`createApiGateway: ${apiGatewayName}`);
  return execCommandAndGetField(
    `yc serverless api-gateway create ${apiGatewayName} --spec="${specFilename}"`,
    "domain"
  );
}

export async function updateApiGatewaySpec(apiGatewayName, specFilename) {
  console.log(`updateApiGatewaySpec: ${apiGatewayName}. ${specFilename}`);
  return execCommandAndGetField(
    `yc serverless api-gateway update ${apiGatewayName} --spec="${specFilename}"`,
    "domain"
  );
}

export async function createFunctionVersion(functionName, sourcePath) {
  console.log(`createFunctionVersion: ${functionName}, ${sourcePath}`);
  return execCommandAndGetField(
    `yc serverless function version create --function-name ${functionName} --execution-timeout 60s --runtime nodejs16 --entrypoint="function.handler" --source-path ${sourcePath}`,
    ""
  );
}

export async function getApiGateWaySpec(apiGatewayName) {
  const res = await execCommand(
    `yc serverless api-gateway get-spec  ${apiGatewayName}`
  );
  return res.stdout;
}

export async function getUserId(userLogin) {
  console.log(`getUserId: ${userLogin}`);
  return execCommandAndGetField(
    `yc iam user-account get --login ${userLogin}`,
    "id"
  );
}

export async function getServiceAccountId(serviceAccountName) {
  console.log(`getServiceAccountId: ${serviceAccountName}`);
  return execCommandAndGetField(
    `yc iam service-account get ${serviceAccountName}`,
    "id"
  );
}

export function createBucketPolicy(bucketName, userId, serviceAccountId) {
  const resource = [
    `arn:aws:s3:::${bucketName}/*`,
    `arn:aws:s3:::${bucketName}`,
  ];
  const consoleReferer = [
    `https://console.cloud.yandex.ru/folders/*/storage/buckets/${bucketName}*`,
    `https://console.cloud.yandex.com/folders/*/storage/buckets/${bucketName}*`,
  ];
  const ownerAndServiceAccountPolicy = {
    Effect: "Allow",
    Principal: {
      CanonicalUser: [userId, serviceAccountId],
    },
    Action: "*",
    Resource: resource,
  };
  const consolePolicy = {
    Sid: "console-statement",
    Effect: "Allow",
    Principal: "*",
    Action: "*",
    Resource: resource,
    Condition: {
      StringLike: {
        "aws:referer": consoleReferer,
      },
    },
  };
  const usersPolicy = {
    Effect: "Allow",
    Principal: "*",
    Action: ["s3:ListBucket", "s3:GetObject"],
    Resource: resource,
  };

  const policy = {
    Version: "2012-10-17",
    Statement: [ownerAndServiceAccountPolicy, consolePolicy, usersPolicy],
  };

  return policy;
}
