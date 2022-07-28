#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebClientStack } from '../lib/web.client-stack';

const app = new cdk.App();
new WebClientStack(app, 'WebClientStack', {
    /* If you don't specify 'env', this stack will be environment-agnostic.
     * Account/Region-dependent features and context lookups will not work,
     * but a single synthesized template can be deployed anywhere. */
    env: { account: process.env.AWS_ACCOUNT, region: process.env.AWS_REGION },
});
