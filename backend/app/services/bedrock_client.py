import boto3
import json
import random
from app.config import config

class BedrockClient:
    def __init__(self):
        self.client = boto3.client(
            "bedrock-runtime",
            region_name=config.AWS_REGION,
            aws_access_key_id=config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
        )
        self.models = [
            "amazon.nova-micro-v1:0",
            "amazon.nova-lite-v1:0",
            "anthropic.claude-3-haiku-20240307-v1:0",
            "anthropic.claude-3-sonnet-20240229-v1:0",
        ]

    def generate_text(self, prompt: str, max_tokens: int = 1024) -> str:
        for model_id in self.models:
            try:
                if "nova" in model_id:
                    body = json.dumps({
                        "messages": [{"role": "user", "content": prompt}],
                        "inferenceConfig": {"maxTokens": max_tokens, "temperature": 0.7}
                    })
                else:
                    body = json.dumps({
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": max_tokens,
                        "anthropic_version": "bedrock-2023-05-31"
                    })
                response = self.client.invoke_model(modelId=model_id, body=body)
                result = json.loads(response["body"].read())
                if "nova" in model_id:
                    return result["output"]["message"]["content"][0]["text"]
                else:
                    return result["content"][0]["text"]
            except Exception:
                continue
        raise Exception("All models failed")

    def generate_embeddings(self, text: str) -> list:
        try:
            body = json.dumps({"inputText": text})
            response = self.client.invoke_model(
                modelId="amazon.titan-embed-text-v1", body=body
            )
            return json.loads(response["body"].read())["embedding"]
        except Exception:
            return [random.random() for _ in range(1536)]

bedrock_client = BedrockClient()
