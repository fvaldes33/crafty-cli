const fs = require('fs');
const path = require('path');
const replace = require("replace");

module.exports = {
    getCurrentDirectoryBase : function() {
        return path.basename(process.cwd());
    },

    directoryExists : function(filePath) {
        try {
            return fs.statSync(filePath).isDirectory();
        } catch (err) {
            return false;
        }
    },

    fileExists: function(filePath) {
        try {
            return fs.statSync(filePath).isFile();
        } catch (err) {
            return false;
        }
    },

    rename: function(oldPath, newPath){
        var _this = this;
        return new Promise((resolve, reject) => {
            fs.rename(oldPath, newPath, function(){
                if (_this.fileExists(newPath)){
                    resolve(true);
                } else {
                    reject(false);
                }
            });
        })
    },

    moveTpl: function(fromPath, toPath, data){
        var _this = this;
        return new Promise((resolve, reject) => {
            fs.createReadStream(fromPath)
                .pipe(fs.createWriteStream(toPath))
                .on('close', function(){
                    if (_this.fileExists(toPath)){
                        if (_this.doReplace(toPath, data)){
                            resolve(true);
                        }
                    } else {
                        reject(false);
                    }
                });
        });
    },

    doReplace: function(filePath, data){
        data.forEach((findReplace) => {
            var options = {
                regex: findReplace.find,
                replacement: findReplace.replace,
                paths: [filePath],
                silent: true
            };

            replace(options);
        });

        return true;
    },

    deleteFile: function(filePath){
        try {
            fs.unlinkSync(filePath);    
        } catch(err) {
            return false;
        }
        
    }

};