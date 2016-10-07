'use strict';

const chalk = require("chalk"),
    child_process = require('child_process'),
    files = require('./files'),
    inquirer = require("inquirer"),
    pleasant = require("pleasant-progress");

/* Store Plugin Data */
let plugin = {};

let init = (action, name) => {
    // Init this module
    console.log(chalk.bold.blue('[ INITIALIZING ]'));
    plugin.name = name;
    plugin.action = action;

    if (!isCraft()){
        console.log(chalk.bold.red('! Not inside a Craft Project'));
        process.exit();
    }

    switch(action){
        case 'add':
            addPlugin();
        break;
        
        case 'list':
            listPlugins();
        break;

        case 'remove':
            removePlugin();
        break;
    }
}

let isCraft = () => {
    // Are we in a craft install
    return files.directoryExists('craft');
};


let listPlugins = () => {
    let list = [];

    list = files.list('craft/plugins/');

    list.forEach(function(plugin){
        console.log(chalk.green('- ' + plugin));
    });
    
    process.exit();
};


let addPlugin = () => {
    if (exists()){
        console.log(chalk.bold.red('Plugin ' + plugin.name + ' already installed'));
        process.exit();
    }

    console.log(chalk.bold.green('+ Ok, Lets add this awesome plugin!'));

    let getGitUrl = {
        name: 'url',
        type: 'text',
        message: 'Plugin Git Repo:',
        validate: function(value) {
            if (value.length){
                var reg = new RegExp(/^git.*.git$/);
                if (! value.match(reg)){
                    return 'Please use .git urls';
                }
                return true;
            } else {
                return false;
            }
        }
    };

    inquirer.prompt(getGitUrl).then((response) => {
        plugin.url = response.url;
        cloneRepo();
    });
};


let removePlugin = () => {
    if (! exists()){
        console.log(chalk.bold.red('Plugin ' + plugin.name + ' is not installed'));
        process.exit();
    }

    let confirmDelete = {
        name: 'sure',
        type: 'confirm',
        message: 'Are you sure you want to delete ' + plugin.name + '?'
    };

    inquirer.prompt(confirmDelete).then((response) => {
        if (!response.sure){
            process.exit();
        }

        child_process.exec('rm -rf craft/plugins/' + plugin.name, function(){
            complete();
        });
    });

};


let exists = () => {
    // Does this plugin already exist?
    return files.directoryExists('craft/plugins/' + plugin.name);
};


let cloneRepo = () => {
    console.log(chalk.bold.green('+ Found git repo. Lets Clone it.'));

    let progress = new pleasant();
        progress.start('Cloning');

    child_process.exec('git clone ' + plugin.url + ' craft/plugins/' + plugin.name, function(){
        progress.stop();
        complete();
    });
};


let complete = () => {
    // Complete message
    if (plugin.action == 'add'){
        console.log(chalk.bold.green('Plugin "' + plugin.name + '"" installed'));
        process.exit();
    }

    console.log(chalk.bold.green('Plugin "' + plugin.name + '"" removed'));
    process.exit();
};

module.exports = init;