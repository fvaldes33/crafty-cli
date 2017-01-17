'use strict';

/* NODE_MODULE Dependencies */
const async = require("async"),
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
    pkg = require("../package"),
    Promise = require("promise"),
    program = require("commander"),
    touch = require("touch"),
    unzip = require("unzip");

/* Project Dependencies */
const files = require('./files');

const INSTALL_CONFIG = require('../install/craft');
const craftyPath = getInstalledPath('crafty-cli') + '/';

/* Store Prefs */
let prefs = {};
let installTypeConfig = null;

/* Setup Download Method */
let doDownload = (url, dest) => {
    return download(url, dest, {mode: '775', extract: true});
};


let init = (name) => {
    
    if (!name) {
        console.log(chalk.bold.red('[ Error ] : Please provide a name for your project.'));
        process.exit();
    }

    if (files.directoryExists(name)) {
        console.log(chalk.bold.red(name + ' directory already exist!'));
        process.exit();
    }

    clear();

    console.log(
        chalk.bold.red(
            figlet.textSync('Crafty', { horizontalLayout: 'full'})
        )
    );
    
    console.log(chalk.bold.blue('[ Initializing ]'));

    prefs = {
        name: name,
        dir: process.cwd() + '/' + name
    };

    console.log(chalk.green('✓ Directory Check'));

    // makey();
    chooseInstall();
};

let chooseInstall = () => {
    console.log(chalk.bold.blue('[ CHOOSE INSTALL ]'));
    console.log(chalk.green('+ For now, we only support Docker... Learn more at https://www.docker.com.'));

    let installQuestion = [
        {
            name: 'install',
            type: 'list',
            message: 'Choose install type?',
            choices: [
                { 'name' : 'Local', 'value' : 'LOCAL' },
                { 'name' : 'Docker', 'value' : 'DOCKER' }
            ],
            validate: function( response ) {
                return true;
            }
        }
    ];

    inquirer.prompt(installQuestion).then((response) => {
        if (response.install == 'DOCKER'){
            prefs.installType = 'DOCKER';
        } else {
            prefs.installType = 'LOCAL';
        }
       
        makey();
    });
}

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
        
        if (prefs.installType == 'DOCKER') {
            dockerQuestion();
        } else {
            preparePlugins();    
        }
    });
};

let dockerQuestion = () => {
    console.log(chalk.bold.blue('[ DOCKER QUESTIONS ]'));
    console.log(chalk.green('+ Choose port for docker.'));

    let dockerPort = [
        {
            name: 'port',
            type: 'text',
            message: 'Choose docker port:',
            validate: function(value) {
                if (value.length){
                    return true;
                } else {
                    return false;
                }
            }
        }
    ];

    inquirer.prompt(dockerPort).then((response) => {
        prefs.port = response.port;
        
        preparePlugins();  
    });
}

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
    pluginCleanup();
};

let pluginCleanup = () => {
    console.log(chalk.bold.blue('[ PLUGINS:CLEAN UP ]'));

    let progress = new pleasant();
        progress.start('Cloning');

    prefs.plugins.forEach(function(plugin){
        console.log(chalk.green('+ Cloning ' + plugin.name));
        child_process.execSync('cd craft/plugins/' + plugin.name + ' && rm -rf .git');
    });

    progress.stop();
    configure();
}

let configure = () => {
    console.log(chalk.bold.blue('[ CONFIGURATION ]'));
    
    installTypeConfig = INSTALL_CONFIG.CRAFT_INSTALL[prefs.installType];

    console.log(chalk.bold.blue('[ ' + prefs.installType + ' ]'));

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

            files.deleteFile(installTypeConfig.DB.dest);

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

            files.moveTpl(craftyPath + installTypeConfig.DB.src, prefs.dir + installTypeConfig.DB.dest, rp)
                .then((result) => {
                    console.log(chalk.bold.green('✓ Done Creating new db.php'));
                    callback(null);
                })
                .catch((error) => {
                    console.log(chalk.bold.red('! Error Creating new db.php'));
                    process.exit();
                });
        },

        function(callback) {
            /* IF NOT DOCKER SKIP THIS PART */
            if (prefs.installType != 'DOCKER') {
                callback(null);
            }

            console.log(chalk.green('+ Creating new docker-composer.yml'));

            // TODO:: ALLOW FOR USER TO PICK IMAGE TO USE
            // let rp = [
            //     {
            //         find: '{{appName}}',
            //         replace: prefs.name
            //     }
            // ];

            files.moveTpl(craftyPath + installTypeConfig.COMPOSE.src, prefs.dir + installTypeConfig.COMPOSE.dest)
                .then((result) => {
                    console.log(chalk.bold.green('✓ Done Creating new docker-composer.yml'));
                    callback(null);
                })
                .catch((error) => {
                    console.log(chalk.bold.red('! Error Creating new docker-composer.yml'));
                    process.exit();
                });

        },

        function(callback) {
            /* IF NOT DOCKER SKIP THIS PART */
            if (prefs.installType != 'DOCKER') {
                callback(null);
            }

            console.log(chalk.green('+ Creating new .ignore'));

            files.moveTpl(craftyPath + installTypeConfig.IGNORE.src, prefs.dir + installTypeConfig.IGNORE.dest)
                .then((result) => {
                    console.log(chalk.bold.green('✓ Done Creating new ignore'));
                    callback(null);
                })
                .catch((error) => {
                    console.log(chalk.bold.red('! Error Creating new ignore'));
                    process.exit();
                });
        },

        function(callback) {
            /* IF NOT DOCKER SKIP THIS PART */
            if (prefs.installType != 'DOCKER') {
                callback(null);
            }

            console.log(chalk.green('+ Creating new .env'));

            let rp = [
                {
                    find: '{{port}}',
                    replace: prefs.port || 8000
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

            files.moveTpl(craftyPath + installTypeConfig.ENV.src, prefs.dir + installTypeConfig.ENV.dest, rp)
                .then((result) => {
                    console.log(chalk.bold.green('✓ Done Creating new .env'));
                    console.log(chalk.bold.red('!!!! --- Make sure to change your PORT to your desired port in this .env file --- !!!!'));
                    callback(null);
                })
                .catch((error) => {
                    console.log(chalk.bold.red('! Error Creating new .env'));
                    process.exit();
                });
        },

        function(callback){
            console.log(chalk.green('+ Creating new general.php'));

            files.deleteFile(prefs.dir + installTypeConfig.GENERAL.dest);

            let rp = [
                {
                    find: '{{appName}}',
                    replace: prefs.name
                }
            ];

            if (prefs.installType == 'DOCKER') {
                rp.push({
                    find: '{{port}}',
                    replace: prefs.port || 8000
                });
            }

            files.moveTpl(craftyPath + installTypeConfig.GENERAL.src, prefs.dir + installTypeConfig.GENERAL.dest, rp)
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

            /* IF NOT LOCAL DO NOT ATTEMPT TO CREATE DATABASE */
            if (prefs.installType != 'LOCAL') {
                console.log(chalk.bold.red('Please read how to set up your database in docker when install is complete'));
                
                callback(null);
            } else {
                console.log(chalk.green('> Creating ' + prefs.dbname + ' database'));
                
                let createDbCommand = 'echo "create database '+ prefs.dbname +'" | mysql -h 127.0.0.1 -u ' + prefs.dbuser + ' -p' + prefs.dbpwd;

                child_process.execSync(createDbCommand);

                console.log(chalk.bold.green('✓ Done Creating ' + prefs.dbname + ' database'));

                callback(null);
            }
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

    if (prefs.installType == "DOCKER") {
        let progress = new pleasant();
            progress.start('Starting up Docker');

        setTimeout(() => {
            child_process.exec('cd ' + prefs.dir + ' && docker-compose up -d', () => {
                progress.stop();

                console.log(chalk.blue('Your docker is already running... Please give it a second to boot up and create your environment'));
                console.log(chalk.blue('[ DOCKER COMMANDS ]'));
                console.log(chalk.blue('To start your docker: docker-compose up -d'));
                console.log(chalk.blue('To stop your docker: docker-compose stop'));

                console.log(chalk.blue('CraftCms is ready to be installed @ http://localhost:' + prefs.port + '/admin'));

                process.exit();
            });
        }, 5000);
    } else {
        process.exit();
    }

};

module.exports = init;