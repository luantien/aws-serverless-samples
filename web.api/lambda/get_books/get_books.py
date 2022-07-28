import boto3
import json
import logging
import uuid
import os
import argparse
from collections import defaultdict


logger = logging.getLogger()
logger.setLevel(logging.INFO)

lambda_env = os.getenv('LAMBDA_ENV', 'prod')
db_region = os.getenv('DYNAMODB_REGION')
db_endpoint = os.getenv('DYNAMODB_ENDPOINT')
db_table = os.getenv('DYNAMODB_TABLE_NAME')

if lambda_env == 'prod':
    logger.info('Using dynamodb in region: %s\n', db_region)
    client = boto3.client('dynamodb', region_name=db_region)
else:
    logger.info("Using dynamodb local: %s\n", db_endpoint)
    client = boto3.client('dynamodb', endpoint_url=db_endpoint)


def handler(event, context):
    query_params = event['queryStringParameters']
    logger.info('Received event query: %s', query_params)

    if query_params:
        # query for books by filter and value
        logger.info('Query for books by filter and value')
        response = client.query(
            TableName=db_table,
            IndexName=query_params['filter']+'Index',
            KeyConditions={
                query_params['filter']: {
                    'AttributeValueList': [{'S': query_params['value']}],
                    'ComparisonOperator': 'EQ'
                }
            })
    else:
        logger.info('Query for all books')
        response = client.scan(TableName=db_table)

    return {
        'statusCode': 200,
        'body': json.dumps(getBooksJson(response['Items']))
    }


def getBooksJson(items):
    books = defaultdict(list)

    for item in items:
        if (item["EntityType"]["S"] == 'book'):
            book = {}

            book["bookId"] = item["PK"]["S"]
            book["title"] = item["Title"]["S"]
            book["publishedDate"] = item["PublishedDate"]["S"]
            book["author"] = item["Author"]["S"]
            books["books"].append(book)

    return books
