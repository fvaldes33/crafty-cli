#! /usr/bin/env node
'use strict';

/* NODE_MODULE Dependencies */
const async = require("async"),
    clui = require('clui'),
    clear = require("clear"),
    chalk = require("chalk"),
    child_process = require('child_process'),
    download = require('download'),
    inquirer = require("inquirer"),
    figlet = require("figlet"),
    fs = require("fs"),
    getInstalledPath = require("get-installed-path"),
    path = require("path"),
    pleasant = require("pleasant-progress"),
    pkg = require("./package"),
    Preferences = require("preferences"),
    Promise = require("promise"),
    program = require("commander"),
    request = require("request"),
    spinner = clui.Spinner,
    touch = require("touch"),
    unzip = require("unzip");

/* Project Dependencies */
const files = require('./lib/files');
const plugins = require('./lib/plugins');

const INSTALL_CONFIG = require('./install/craft');
const craftyPath = getInstalledPath('crafty-cli') + '/';

/* Store Prefs */
let prefs = {};

/* Setup Download Method */
let doDownload = (url, dest) => {
    return download(url, dest, {mode: '775', extract: true});
};


let begin = (name) => {
    clear();

    console.log(
        chalk.bold.red(
            figlet.textSync('Crafty', { horizontalLayout: 'full'})
        )
    );
    console.log(chalk.bold.blue('[ Initializing ]'));

    if (files.directoryExists(name)) {
        console.log(chalk.bold.red(name + ' directory already exist!'));
        process.exit();
    }

    prefs = {
        name: name,
        dir: process.cwd() + '/' + name
    };

    console.log(chalk.green('✓ Directory Check'));

    makey();
};


let makey = () => {
    console.log(chalk.green('+ Creating Directory'));

    let p = new Promise(function(resolve, reject){
        fs.mkdir(prefs.dir, function(){
            if (files.directoryExists(prefs.dir)) {
                resolve(true);
            } else {
                reject(false);
            }
        });
    });

    p.then((result) => {
        console.log(chalk.green('✓ Directory Created'));
        prepareDatabase();
    })
    .catch((error) => {
        console.log(chalk.red('! Error creating directory'));
        process.exit();
    });
};


let prepareDatabase = () => {
    console.log(chalk.bold.blue('[ PROMPTS ]'));
    console.log(chalk.green('+ Add database credentials.'));

    let dbQuestions = [
        {
            name: 'dbname',
            type: 'input',
            message: 'Please enter database name:',
            validate: function( value ) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter a database name';
                }
            }
        },
        {
            name: 'dbuser',
            type: 'input',
            message: 'Please enter your database user:',
            validate: function( value ) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter your database user';
                }
            }
        },
        {
            name: 'dbpwd',
            type: 'password',
            message: 'Please enter your database user password:',
            validate: function( value ) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter your database user password';
                }
            }
        }
    ];

    inquirer.prompt(dbQuestions).then((response) => {
        prefs.dbname = response.dbname;
        prefs.dbuser = response.dbuser;
        prefs.dbpwd = response.dbpwd;
        
        preparePlugins();
    });

};


let preparePlugins = () => {
    console.log(chalk.green('+ Add any craft plugins you want.'));

    prefs.plugins = [];

    let confirm = {
        name: 'add',
        type: 'confirm',
        message: 'Add plugin:',
        validate: function(bool) {
            if(bool){
                return true;
            } else {
                return false;
            }
        }
    };

    let pluginQuestions = [
        {
            name: 'name',
            type: 'text',
            message: 'Plugin Name: (lowercase)',
            validate: function(value) {
                if (value.length){
                    return true;
                } else {
                    return false;
                }
            }
        },
        {
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
        },
        {
            name: 'more',
            type: 'confirm',
            message: 'Add more plugins:',
            validate: function(bool) {
                if(bool){
                    return true;
                } else {
                    return false;
                }
            }
        },
    ];

    let addPlugin = () => {
        inquirer.prompt(pluginQuestions).then((response) => {
            prefs.plugins.push(response);

            if (response.more){
                addPlugin();
            } else {
                downloadCraft();
            }
        });
    };

    inquirer.prompt(confirm).then((response) => {
        if (response.add){
            addPlugin();
        } else {
            downloadCraft();
        }
    });
    
};


let downloadCraft = () => {
    console.log(chalk.bold.blue('[ CRAFTCMS ]'));
    
    let progress = new pleasant();
        progress.start('Working');

    doDownload(INSTALL_CONFIG.CRAFT_INSTALL.LOCATION, prefs.dir)
        .then((result) => {
            progress.stop();
            console.log(chalk.bold.green('✓ Done Downloading CraftCms'));
            if (prefs.plugins.length) {
                downloadPlugins();
            } else {
                configure();
            }
        }).catch((error) => {
            console.log(chalk.bold.red('! Error Downloading CraftCms'));
            process.exit();
        });
};


let downloadPlugins = () => {
    console.log(chalk.bold.blue('[ PLUGINS ]'));

    let progress = new pleasant();
        progress.start('Cloning');

    prefs.plugins.forEach(function(plugin){
        console.log(chalk.green('+ Cloning ' + plugin.name));
        child_process.execSync('git clone ' + plugin.url + ' ' + prefs.dir + '/craft/plugins/' + plugin.name);
    });

    progress.stop();
    configure();
};


let configure = () => {
    console.log(chalk.bold.blue('[ CONFIGURATION ]'));
    
    async.series([

        function(callback){
            console.log(chalk.green('+ Renaming htaccess'));

            files.rename(prefs.dir + INSTALL_CONFIG.CRAFT_INSTALL.RENAME.src, prefs.dir + INSTALL_CONFIG.CRAFT_INSTALL.RENAME.dest)
                .then((result) => {
                    console.log(chalk.bold.green('✓ Done Renaming htaccess'));
                    callback(null);
                })
                .catch((error) => {
                    console.log(chalk.bold.red('! Error Renaming htaccess'));
                    process.exit();
                });
        },

        function(callback){
            console.log(chalk.green('+ Creating new db.php'));

            files.deleteFile(prefs.dir + INSTALL_CONFIG.CRAFT_INSTALL.DB.dest);

            let rp = [
                {
                    find: '{{appName}}',
                    replace: prefs.name
                },
                {
                    find: '{{dbName}}',
                    replace: prefs.dbname
                },
                {
                    find: '{{dbUser}}',
                    replace: prefs.dbuser
                },
                {
                    find: '{{dbPwd}}',
                    replace: prefs.dbpwd
                }
            ];

            files.moveTpl(craftyPath + INSTALL_CONFIG.CRAFT_INSTALL.DB.src, prefs.dir + INSTALL_CONFIG.CRAFT_INSTALL.DB.dest, rp)
                .then((result) => {
                    console.log(chalk.bold.green('✓ Done Creating new db.php'));
                    callback(null);
                })
                .catch((error) => {
                    console.log(chalk.bold.red('! Error Creating new db.php'));
                    process.exit();
                });
        },

        function(callback){
            console.log(chalk.green('+ Creating new general.php'));

            files.deleteFile(prefs.dir + INSTALL_CONFIG.CRAFT_INSTALL.GENERAL.dest);

            let rp = [
                {
                    find: '{{appName}}',
                    replace: prefs.name
                }
            ];

            files.moveTpl(craftyPath + INSTALL_CONFIG.CRAFT_INSTALL.GENERAL.src, prefs.dir + INSTALL_CONFIG.CRAFT_INSTALL.GENERAL.dest, rp)
                .then((result) => {
                    console.log(chalk.bold.green('✓ Done Creating new general.php'));
                    callback(null);
                })
                .catch((error) => {
                    console.log(chalk.bold.red('! Error Creating new general.php'));
                    process.exit();
                });
        },

        function(callback){
            console.log(chalk.bold.blue('[ PERMISSIONS ]'));

            console.log(chalk.green('> Setting global permissions to 755 / 644'));
            child_process.execSync('cd ' + prefs.dir + ' && chmod -R 755 *');
            child_process.execSync('cd ' + prefs.dir + ' && find . -type f -exec chmod 644 {} \\;');
            console.log(chalk.green('> Setting permissions on craft/app to 775 / 644'));
            child_process.execSync('cd ' + prefs.dir + ' && chmod -R 775 craft/app');
            child_process.execSync('cd ' + prefs.dir + ' && find craft/app/ -type f -exec chmod 664 {} \\;');
            console.log(chalk.green('> Setting permissions on craft/config to 775 / 644'));
            child_process.execSync('cd ' + prefs.dir + ' && chmod -R 775 craft/config');
            child_process.execSync('cd ' + prefs.dir + ' && find craft/config/ -type f -exec chmod 664 {} \\;');
            console.log(chalk.green('> Setting permissions on craft/storage to 775 / 644'));
            child_process.execSync('cd ' + prefs.dir + ' && chmod -R 775 craft/storage');
            child_process.execSync('cd ' + prefs.dir + ' && find craft/storage/ -type f -exec chmod 664 {} \\;');

            console.log(chalk.bold.green('✓ Done Setting Permissions'));
            callback(null);
        },

        function(callback){
            console.log(chalk.bold.blue('[ DATABASE ]'));

            console.log(chalk.green('> Creating ' + prefs.dbname + ' database'));

            let createDbCommand = 'echo "create database '+ prefs.dbname +'" | mysql -u ' + prefs.dbuser + ' -p' + prefs.dbpwd;

            child_process.execSync(createDbCommand);

            console.log(chalk.bold.green('✓ Done Creating ' + prefs.dbname + ' database'));

            callback(null);
        },

        function(callback){
            console.log(chalk.bold.blue('[ DONE ]'));
            finish();
        }

    ]);

};

let finish = () => {
    console.log(chalk.green('✓ Done creating project: ' + prefs.name));
    console.log(chalk.green('✓ Plugins Installed: ' + prefs.plugins.length));
    console.log(chalk.green('✓ Database: ' + prefs.dbname + ' ready'));
    console.log(chalk.green('✓ Prod: ' + prefs.name + '.com'));
    console.log(chalk.green('✓ Dev: ' + prefs.name + '.dev'));

    process.exit();
};


program
    .version(pkg.version)
    .command('start [name]')
    .description('Start Craft Project')
    .action(begin);

program
    .version(pkg.version)
    .command('plugins [action] [name]')
    .description('List your installed plugins')
    .action((action, name) => {
        if (!action){
            console.log(chalk.bold.red("Available plugin commands are:"));
            console.log(chalk.bold.red("- plugins list"));
            console.log(chalk.bold.red("- plugins add [name]"));
            console.log(chalk.bold.red("- plugins remove [name]"));
            process.exit();
        }

        switch(action) {
            case 'list':
                plugins(action);
            break;
            case 'add':
            case 'remove':
                if (!name) {
                    console.log(chalk.bold.red("Must provide a [name] to " + action));
                    process.exit();
                }
                console.log(action + ' ' + name + ' plugin');
                plugins(action, name);
            break;
        }
    });

program.parse(process.argv);

if (!program.args.length) program.help();
