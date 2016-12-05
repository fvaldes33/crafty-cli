#! /usr/bin/env node
'use strict';

/* NODE_MODULE Dependencies */
const pkg       = require("./package");
const program   = require("commander");
const chalk     = require("chalk");

/* Project Dependencies */
const project   = require('./lib/project');
const plugins   = require('./lib/plugins');

/* Commands */
program
    .version(pkg.version)
    .command('start-project [name]')
    .description('Start Craft Project')
    .action(project);

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
