// /* eslint-disable import/extensions, import/no-absolute-path */
// import { SQSHandler } from "aws-lambda";
// import {
//   GetObjectCommand,
//   PutObjectCommandInput,
//   GetObjectCommandInput,
//   S3Client,
//   PutObjectCommand,
// } from "@aws-sdk/client-s3";

// const s3 = new S3Client();

// export const handler: SQSHandler = async (event) => {
//   console.log("Event ", JSON.stringify(event));
//   for (const record of event.Records) {
//     const recordBody = JSON.parse(record.body);        // Parse SQS message
//     const snsMessage = JSON.parse(recordBody.Message); // Parse SNS message

//     if (snsMessage.Records) {
//       console.log("Record body ", JSON.stringify(snsMessage));
//       for (const messageRecord of snsMessage.Records) {
//         const s3e = messageRecord.s3;
//         const srcBucket = s3e.bucket.name;
//         // Object key may have spaces or unicode non-ASCII characters.
//         const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));
//         let origimage = null;
//         try {
//           // Download the image from the S3 source bucket.
//           const params: GetObjectCommandInput = {
//             Bucket: srcBucket,
//             Key: srcKey,
//           };
//           origimage = await s3.send(new GetObjectCommand(params));
//           // Process the image ......
//         } catch (error) {
//           console.log(error);
//         }
//       }
//     }
//   }
// };

import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body);
    const snsMessage = JSON.parse(recordBody.Message);

    if (snsMessage.Records) {
      for (const messageRecord of snsMessage.Records) {
        const s3e = messageRecord.s3;
        const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));

        const eventType = messageRecord.eventName;

        if (eventType.includes("ObjectCreated")) {
          const typeMatch = srcKey.match(/\.([^.]*)$/);
          if (!typeMatch) {
            throw new Error("Could not determine the image type.");
          }
          const imageType = typeMatch[1].toLowerCase();
          if (imageType !== "jpeg" && imageType !== "png") {
            throw new Error(`Unsupported image type: ${imageType}`);
          }

          await ddbDocClient.send(
            new PutCommand({
              TableName: "Images",
              Item: {
                ImageName: srcKey,
              },
            })
          );
        }
      }
    }
  }
};

// Function to create the DynamoDB Document Client
function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
