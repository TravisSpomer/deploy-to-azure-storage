"use strict"

const fs = require("fs")
const path = require("path")
const process = require("process")
const core = require("@actions/core")
const exec = require("@actions/exec")

const DeployToAzureStorage = async () =>
{
	try
	{
		const sourcePath = core.getInput("source-path")
		const sasUrl = core.getInput("sas-url")
		const cleanup = core.getInput("cleanup")
		const container = core.getInput("container")
		const requireIndex = core.getInput("require-index")

		if (requireIndex)
		{
			if (!fs.existsSync(path.join(sourcePath, "index.html")))
			{
				core.setFailed(`The source path "${sourcePath}" doesn't contain an index.html file. It should be set to the directory containing already-built static website files.`)
				return
			}
		}

		const urlEndOfHost = sasUrl.indexOf("/?")
		if (urlEndOfHost < 0)
		{
			core.setFailed(`The SAS URL supplied (${sasUrl}) doesn't look valid. It should be a full URL with a query string. Generate one in the "Shared access signature" section of the Azure Portal.`)
			return
		}
		const urlHost = sasUrl.substring(0, urlEndOfHost + 1)
		const urlQuery = sasUrl.substring(urlEndOfHost + 2)
		const destUrl = `${urlHost}${container}?${urlQuery}`
		core.setSecret(urlQuery)

		const azCopyCommand = (process.platform === "win32") ? "azcopy" : "azcopy10"

		core.startGroup("Deploy new and updated files")
		let errorCode = await exec.exec(azCopyCommand, ["sync", sourcePath, destUrl])
		if (errorCode)
		{
			core.setFailed("Deployment failed. See log for more details.")
			return
		}
		core.endGroup()

		if (cleanup)
		{
			core.startGroup("Clean up obsolete files")
			errorCode = await exec.exec(azCopyCommand, ["sync", sourcePath, destUrl, "--delete-destination=true"])
			if (errorCode)
			{
				core.setFailed("Cleanup failed. See log for more details.")
				return
			}
			core.endGroup()
		}

		core.info("")
		core.info("------------------------------------------------------------")
		core.info("Deployment was successful.")
		core.info("------------------------------------------------------------")
	}
	catch (error)
	{
		core.setFailed(error.message)
	}
}

DeployToAzureStorage()
