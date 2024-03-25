"use strict";

var path = require("path");
var fs = require("fs");

var constants = {
  platforms: "platforms",
  googleServices: "google-services",
  android: {
    platform: "android",
    wwwFolder: "app/src/main/assets/www"
  },
  wwwFolder: "app/src/main/assets/www",
  extension: ".json"
};

function getResourcesFolderPath(context, platform, platformConfig) {
  var platformPath = path.join(context.opts.projectRoot, constants.platforms, platform);
  return path.join(platformPath, platformConfig.wwwFolder);
}

function isCordovaAbove(context, version) {
  var cordovaVersion = context.opts.cordova.version;
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

function getPlatformConfigs(platform) {
  if (platform === constants.android.platform) {
    return constants.android;
  } else if (platform === constants.ios.platform) {
    return constants.ios;
  }
}

function getAppId(context) {
  var cordovaAbove8 = isCordovaAbove(context, 8);
  var et;
  if (cordovaAbove8) {
    et = require('elementtree');
  } else {
    et = context.requireCordovaModule('elementtree');
  }

  var config_xml = path.join(context.opts.projectRoot, 'config.xml');
  var data = fs.readFileSync(config_xml).toString();
  var etree = et.parse(data);
  return etree.getroot().attrib.id;
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
  var platformConfig = getPlatformConfigs(platform);
  if (!platformConfig) {
    handleError("Invalid platform", defer);
  }
  
  var wwwPath = getResourcesFolderPath(context, platform, platformConfig);
  
  var files = getFilesFromPath(wwwPath);
  if (!files) {
    handleError("No directory found", defer);
  }

  var fileName = files.find(function (name) {
    return name.endsWith(constants.extension);
  });
  if (!fileName) {
    handleError("No file found", defer);
  }

  console.log('path: ' + wwwPath + getAppId(context));
  var sourceFilePath = path.join(wwwPath + getAppId(context), fileName);
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
