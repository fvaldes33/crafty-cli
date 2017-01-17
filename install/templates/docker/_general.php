<?php

/**
 * General Configuration
 *
 * All of your system's general configuration settings go in here.
 * You can see a list of the default settings in craft/app/etc/config/defaults/general.php
 */

return array(
    '*' => array(
        'autoLoginAfterAccountActivation' => true,
        'omitScriptNameInUrls' => true,
        'generateTransformsBeforePageLoad' => true,
        'rememberedUserSessionDuration' => 'P1Y',
        'userSessionDuration' => 'P1D',
        'maxUploadFileSize' => 104857600,
        'siteUrl' => 'http://{{appName}}.com/',
    ),

    'localhost' => array(
        'siteUrl' => 'http://localhost:{{port}}/',
        'devMode' => true,
        'enableTemplateCaching' => false,
        'environmentVariables' => array(
            'env' => 'dev',
            'staticAssetsVersion' => time(),
            'baseUrl'  => 'http://localhost:{{port}}/',
        ),
    ),

    '{{appName}}.com' => array(
        'devMode' => false,
        'enableTemplateCaching' => true,
        'environmentVariables' => array(
            'env' => 'prod',
            'staticAssetsVersion' => '2',
            'baseUrl'  => 'http://{{appName}}.com/',
        ),
    ),

);