import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { SNSEvent, SNSHandler } from "aws-lambda";

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-west-1" });
const TABLE_NAME = "Images";
const validMetadataTypes = ["Caption", "Date", "Photographer"];

export const handler: SNSHandler = async (event: SNSEvent) => {
  for (const record of event.Records) {
    const snsMessage = JSON.parse(record.Sns.Message);
    const metadataType = record.Sns.MessageAttributes?.metadata_type?.Value;

    // check and skips invald types of metadata
    if (!metadataType || !validMetadataTypes.includes(metadataType)) {
      continue;
    }
    const { id, value } = snsMessage;
    //only works if id and value are here
    if (id && value) {
      await updateTable(id, metadataType, value);
    }
  }
};

// updateTable function
const updateTable = async (id: string, metadataType: string, value: string) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      ImageName: { S: id },
    },
    UpdateExpression: `SET #attr = :value`,
    ExpressionAttributeNames: {
      "#attr": metadataType,
    },
    ExpressionAttributeValues: {
      ":value": { S: value },
    },
  };

  await dynamoClient.send(new UpdateItemCommand(params));
};
