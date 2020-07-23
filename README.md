# Deploy to Azure Storage

A GitHub Action that deploys a static website to an Azure Storage account.

## What you'll need

*	A GitHub Actions workflow that builds your static website.
	*	This action is not a static site generator tool—you need to have already set one up before using this, unless your repo already contains a folder of static files.
*	An Azure Storage account with the "static website" feature enabled. (That is, it has a `$web` container.)
*	A SAS URL for your storage account with a long expiration time and write access to the account. Store this as a Secret in your repo.

## Configuration

Make sure you reference this Action in your workflow *after* the static site files have been generated. For example, you'll probably have some steps to run `npm install` and `npm run build` before this action.

Here's an example of how to use the action in your workflow:

```yaml
uses: actions/deploy-to-azure-storage@v1
with:
  source-path: out
  sas-url: ${{ secrets.DEPLOY_SAS_URL }}
```

Then, you'd create a Secret in your repo with the name `DEPLOY_SAS_URL` and a value like "`https://mystorage.blob.core.windows.net/?sv=2020-...%3D`".

### `source-path`

*Required.* The location of your built site files, relative to the root of the repo.

For example, for a [Next.js site exported with `next export`](https://nextjs.org/docs/advanced-features/static-html-export), the generated static files are in a folder called "out".

### `sas-url`

*Required.* Your SAS URL.

*Important:* Don't include a SAS URL in your workflow file directly, or anyone who reads your source code could access and change your storage account! Instead, store it in a Secret (see below) and reference it in your workflow.

#### How to get a SAS URL and save it

1.	Open the Azure Portal and locate the storage account that you want to deploy your website to.
2.	Choose "Shared access signature" in the navigation bar.
3.	At minimum, choose:
	1. Allowed services; Blob
	2. Allowed resource types: all
	3. Allowed permissions: all
	4. Start and expiry date/time: something far in the future, like 10 years from now
4.	Click "Generate SAS and connection string".
5.	Copy the SAS URL (the last box in the UI).
6.	Open your repo in GitHub and go to Settings, then Secrets.
7.	Click "New secret".
	* Name: `DEPLOY_SAS_URL`, or whatever you reference from `sas-url`
	* Value: (paste the SAS URL from step 5)
8.	Click "Add secret".

## How it works

When it executes, this action uses the [AzCopy](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10) tool to sync your built files to your storage account.

It does so in two passes: first, it copies over all new and updated files. (A file is considered updated if its modified date is different.) Then, in the second pass, it removes any existing files that are not in the built source. **Using this action will completely replace the contents of your storage account's `$web` container.**

## Full sample workflow

#### deploy.yml
```yaml
name: Deploy website

on:
  workflow_dispatch:
  push:
    branches: [ master ]

jobs:
  build-and-deploy:
    name: Build and deploy
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
      
    - name: Install Node.js
      uses: actions/setup-node@v1
      with:
        node-version: 12.x
      
    - name: Build website
      run: |
        npm install
        npm run build
        
    - name: Deploy to Azure
      uses: actions/deploy-to-azure-storage@v1
      with:
        source-path: out
        sas-url: ${{ secrets.DEPLOY_SAS_URL }}
```
