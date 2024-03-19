"use strict";

var path = require("path");

var constants = {
  googleServices: "google-services",
  platform: "android",
  wwwFolder: "assets/www",
  extension: ".json"
};

function getResourcesFolderPath(context, platform, platformConfig) {
  var platformPath = path.join(context.opts.projectRoot, constants.platforms, platform);
  return path.join(platformPath, platformConfig.wwwFolder);
}

function getSourceFolderPath(context, wwwPath) {
  var sourceFolderPath;
  var cordovaAbove7 = isCordovaAbove(context, 7);

  // New way of looking for the configuration files' folder
  if (cordovaAbove7) {
    sourceFolderPath = path.join(context.opts.projectRoot, "www");
  } else {
    sourceFolderPath = path.join(wwwPath);
  }

  return sourceFolderPath;
}

function isCordovaAbove(context, version) {
  var cordovaVersion = context.opts.cordova.version;
  console.log(cordovaVersion);
  var sp = cordovaVersion.split('.');
  return parseInt(sp[0]) >= version;
}

function getFilesFromPath(path) {
  return fs.readdirSync(path);
}

function handleError(errorMessage, defer) {
  console.log(errorMessage);
  defer.reject();
}

function copyFromSourceToDestPath(defer, sourcePath, destPath) {
  fs.createReadStream(sourcePath).pipe(fs.createWriteStream(destPath))
  .on("close", function (err) {
    defer.resolve();
  })
  .on("error", function (err) {
    console.log(err);
    defer.reject();
  });
}

function checkIfFolderExists(path) {
  return fs.existsSync(path);
}

module.exports = function(context) {
  
  var cordovaAbove8 = isCordovaAbove(context, 8);
  var cordovaAbove7 = isCordovaAbove(context, 7);
  var defer;
  if (cordovaAbove8) {
    defer = require("q").defer();
  } else {
    defer = context.requireCordovaModule("q").defer();
  }
  
  var platform = context.opts.plugin.platform;
  var platformConfig = utils.getPlatformConfigs(platform);
  if (!platformConfig) {
    handleError("Invalid platform", defer);
  }

  var wwwPath = getResourcesFolderPath(context, platform, platformConfig);


  var files = utils.getFilesFromPath(wwwPath);
  if (!files) {
    handleError("No directory found", defer);
  }

  var fileName = files.find(function (name) {
    return name.endsWith(extension);
  });
  if (!fileName) {
    handleError("No file found", defer);
  }

  var sourceFilePath = path.join(wwwPath, fileName);
  var destFilePath = path.join(context.opts.plugin.dir, fileName);

  copyFromSourceToDestPath(defer, sourceFilePath, destFilePath);

  if (cordovaAbove7) {
    var destPath = path.join(context.opts.projectRoot, "platforms", platform, "app");
    if (checkIfFolderExists(destPath)) {
      var destFilePath = path.join(destPath, fileName);
      copyFromSourceToDestPath(defer, sourceFilePath, destFilePath);
    }
  }
      
  return defer.promise;
}
