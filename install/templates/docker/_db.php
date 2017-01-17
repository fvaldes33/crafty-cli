<?php

/**
 * Database Configuration
 *
 * All of your system's database configuration settings go in here.
 * You can see a list of the default settings in craft/app/etc/config/defaults/db.php
 */

return array(

    '*' => array(
        // The database server name or IP address. Usually this is 'localhost' or '127.0.0.1'.
        'server' => 'localhost',

        // The name of the database to select.
        'database' => '{{dbName}}',

        // The database username to connect with.
        'user' => '{{dbUser}}',

        // The prefix to use when naming tables. This can be no more than 5 characters.
        'tablePrefix' => 'craft',
    ),

    'localhost' => array(
        // The database server name or IP address. Usually this is 'localhost' or '127.0.0.1'.
        'server' => 'db',

        // The name of the database to select.
        'database' => '{{dbName}}',

        // The database username to connect with.
        'user' => '{{dbUser}}',

        // The database password to connect with.
        'password' => '{{dbPwd}}',
    ),

    '{{appName}}.com' => array(
        // The name of the database to select.
        'database' => '{{dbName}}',
    )
);