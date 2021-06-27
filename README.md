# Deploy to Azure Storage

A GitHub Action that deploys a static website to an Azure Storage account.

## What you'll need

* A GitHub Actions workflow that builds your static website.
	* This action is not a static site generator tool—you need to have already set one up before using this, unless your repo already contains a folder of static files.
* An Azure Storage account with the "static website" feature enabled. (That is, it has a `$web` container.)
	* You can disable the `$web` requirement for unusual deployment scenarios using `container: assets, require-index: false`.
* A SAS URL for your storage account with a long expiration time and write access to the account.

## Usage

Here's an example of how to use the action in your workflow. If you have a repo that uses Node.js to create files in the "build" folder and the branch you want to publish from is your default, you can add it as-is to your project with no changes.

**.github/workflows/deploy.yml**

```yaml
name: Deploy website

on:
  workflow_dispatch:
  push:
    branches: [ main ]

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
      uses: TravisSpomer/deploy-to-azure-storage@v1.4.0
      with:
        source-path: build
        sas-url: ${{ secrets.DEPLOY_SAS_URL }}
```

Then, you'd create a Secret in your repo with the name `DEPLOY_SAS_URL` and a value like "`https://mystorage.blob.core.windows.net/?sv=2020-...%3D`".

### How to get a SAS URL and save it

1. Open the Azure Portal and locate the storage account that you want to deploy your website to.
2. Choose "Shared access signature" in the navigation bar.
3. At minimum, choose:
	1. Allowed services: Blob
	2. Allowed resource types: all
	3. Allowed permissions: all
	4. Start and expiry date/time: something far in the future, like 10 years from now
4. Click "Generate SAS and connection string".
5. Copy the SAS URL (the last box in the UI).
6. Open your repo in GitHub and go to Settings, then Secrets.
7. Click "New secret".
	* Name: `DEPLOY_SAS_URL`, or whatever you reference from `sas-url`
	* Value: (paste the SAS URL from step 5)
8. Click "Add secret".

## Options

### `source-path`

*Required.* The location of your built site files, relative to the root of the repo.

For example, for a [Next.js site exported with `next export`](https://nextjs.org/docs/advanced-features/static-html-export), the generated static files are in a folder called "out".

### `sas-url`

*Required.* Your SAS URL.

*Important:* Don't include a SAS URL in your workflow file directly, or anyone who reads your source code could access and change your storage account! Instead, store it in a Secret (see below) and reference it in your workflow.

### `cleanup`

Optional: defaults to `true`. If `false`, files that exist on the storage container that aren't in `source-path` *won't* be removed.

If `immutable` is used, files with those extensions will be left there by default. If you want to clean up those too, also specify `cleanup-immutable: true`.

```yaml
cleanup: false
```

### `container`

Optional; defaults to `$web`. The name of the storage container to use. You'd only change this parameter if you have a deployment scenario that uses Azure Blob Storage but *not* the static website feature.

```yaml
container: assets
```

### `immutable`

Optional; defaults to empty. A list of extensions in the format `*.js;*.css` that should be uploaded with [Cache-Control](https://csswizardry.com/2019/03/cache-control-for-civilians/) settings indicating that the file is immutable.

*Important:* Only use this if you are "cache-busting" files of those types by including a timestamp or thumbprint in the filename itself. For example, `site.2dff0abe.js`. Otherwise, CDNs and browsers will go *a year* between checking for updates to the file.

If this setting is left out or empty, no special cache control settings are used. Extensions should be listed as a semicolon-separated list of wildcard patterns with no spaces.

These files are ignored by `cleanup` unless you also specify `cleanup-immutable: true`.

```yaml
immutable: "*.js;*.css"
```

### `cleanup-immutable`

Optional; defaults to `false`. If using `cleanup` and `immutable`, setting `cleanup-immutable` to `true` will cause immutable files to be cleaned up too.

* If `cleanup` is `false`: This setting is ignored.
* If `immutable` is empty: This setting is ignored.
* If `immutable` is not empty and `cleanup` is true:
	* If `cleanup-immutable` is `true`: Remove all leftover files in the storage container, including the immutable ones.
	* If `cleanup-immutable` is `false`: Remove all leftover files in the storage container *except* the immutable ones.

### `require-index`

Optional; defaults to `true`. If `false`, the normal check to verify that `source-path` contains an `index.html` at the root will be disabled. Only useful in unusual deployment scenarios, such as if you have configured a different name for your default document.

```yaml
require-index: false
```

## How it works

**Using this action will completely replace the contents of your storage account's `$web` container.**

When it executes, this action uses the [AzCopy](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10) tool to sync your built files to your storage account.

It does so in two passes: first, it copies over all new and updated files. (A file is considered updated if its modified date is different.) Then, in the second pass, it removes any existing files that are not in the built source. (You can skip the second pass by using `cleanup: false`.)

---

This action is © 2020-2021 Travis Spomer but released to the public domain under the [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0) license. This license does not apply to external libraries referenced by this action; only the action itself. It is provided as-is and no warranties are made as to its functionality or suitability.
