<?php
$to = $_REQUEST['emailAddress'];
$subject = $_REQUEST['subject'];
$payload = $_REQUEST['payload'];
$payloadArray = explode(",", $payload);
$title = $payloadArray[0];
$body = $payloadArray[1];
$bodyNote = $payloadArray[2];
$moreLink = $payloadArray[3];
$actionText = $payloadArray[4];


$message = '<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en"><head>
<!--[if !mso]>-->
<link href="https://fonts.googleapis.com/css?family=Work+Sans" rel="stylesheet">
<!--<![endif]-->
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width">
<title>Runwae Email</title>
<style>
    @media only screen {
        html {
            min-height: 100%;
            background: #1d1d1d
        }
    }

    @media only screen and (max-width:840px) {
        .small-float-center {
            margin: 0 auto !important;
            float: none !important;
            text-align: center !important
        }
    }

    @media only screen and (max-width:840px) {
        table.body img {
            width: auto;
            /* height: auto */
        }

        table.body center {
            min-width: 0 !important
        }

        table.body .container {
            width: 95% !important
        }

        table.body .columns {
            height: auto !important;
            -moz-box-sizing: border-box;
            -webkit-box-sizing: border-box;
            box-sizing: border-box;
            padding-left: 40px !important;
            padding-right: 40px !important
        }

        table.body .columns .columns {
            padding-left: 0 !important;
            padding-right: 0 !important
        }

        table.body .collapse .columns {
            padding-left: 0 !important;
            padding-right: 0 !important
        }

        th.small-6 {
            display: inline-block !important;
            width: 50% !important
        }

        th.small-12 {
            display: inline-block !important;
            width: 100% !important
        }

        .columns th.small-12 {
            display: block !important;
            width: 100% !important
        }

        table.menu {
            width: 100% !important
        }

        table.menu td,
        table.menu th {
            width: auto !important;
            display: inline-block !important
        }

        table.menu.vertical td,
        table.menu.vertical th {
            display: block !important
        }

        table.menu[align=center] {
            width: auto !important
        }
    }
</style>
</head>

<body style="-moz-box-sizing:border-box;-ms-text-size-adjust:100%;-webkit-box-sizing:border-box;-webkit-text-size-adjust:100%;Margin:0;box-sizing:border-box;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;min-width:100%;padding:0;text-align:left;width:100%!important">
<span class="preheader" style="color:#1d1d1d;display:none!important;font-size:1px;line-height:1px;max-height:0;max-width:0;mso-hide:all!important;opacity:0;overflow:hidden;visibility:hidden"></span>
<table class="body" style="Margin:0;background:#1d1d1d;border-collapse:collapse;border-spacing:0;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;height:100%;line-height:1.4;margin:0;padding:0;text-align:left;vertical-align:top;width:100%">
    <tbody>
        <tr style="padding:0;text-align:left;vertical-align:top">
            <td class="center" align="center" valign="top" style="-moz-hyphens:auto;-webkit-hyphens:auto;Margin:0;border-collapse:collapse!important;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;hyphens:auto;line-height:1.4;margin:0;padding:0;text-align:left;vertical-align:top;word-wrap:break-word">
                <center data-parsed="" style="min-width:800px;width:100%">
                    <table align="center" class="container float-center" style="Margin:0 auto;background:0 0;border-collapse:collapse;border-spacing:0;float:none;margin:0 auto;padding:0;text-align:center;vertical-align:top;width:800px">
                        <tbody>
                            <tr style="padding:0;text-align:left;vertical-align:top">
                                <td style="-moz-hyphens:auto;-webkit-hyphens:auto;Margin:0;border-collapse:collapse!important;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;hyphens:auto;line-height:1.4;margin:0;padding:0;text-align:left;vertical-align:top;word-wrap:break-word">
                                    <table class="row collapse" style="border-collapse:collapse;border-spacing:0;display:table;padding:0;position:relative;text-align:left;vertical-align:top;width:100%">
                                        <tbody>
                                            <tr style="padding:0;text-align:left;vertical-align:top">
                                                <th class="small-12 large-12 columns first last" style="Margin:0 auto;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0 auto;padding:0;padding-bottom:40px;padding-left:0;padding-right:0;text-align:left;width:820px">
                                                    <table style="border-collapse:collapse;border-spacing:0;padding:0;text-align:left;vertical-align:top;width:100%">
                                                        <tbody>
                                                            <tr style="padding:0;text-align:left;vertical-align:top">
                                                                <th style="Margin:0;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;padding:0;text-align:left">
                                                                    <center data-parsed="" style="min-width:680px;width:100%"><img src="https://runwae.com/img/emailheader.png" alt="Runwae Logo" align="center" class="float-center" style="-ms-interpolation-mode:bicubic;Margin:0 auto;clear:both;display:block;float:none;margin:0 auto;max-width:100%;outline:0;text-align:center;text-decoration:none;width:auto">
                                                                    </center>
                                                                </th>
                                                                <th class="expander" style="Margin:0;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;padding:0!important;text-align:left;visibility:hidden;width:0">
                                                                </th>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </th>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table class="row" style="border-collapse:collapse;border-spacing:0;display:table;padding:0;position:relative;text-align:left;vertical-align:top;width:100%">
                                        <tbody>
                                            <tr style="padding:0;text-align:left;vertical-align:top">
                                                <th class="small-12 large-8 columns first" style="Margin:0 auto;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0 auto;padding:0;padding-bottom:40px;padding-left:40px;padding-right:20px;text-align:left;width:493.33px">
                                                    <table style="border-collapse:collapse;border-spacing:0;padding:0;text-align:left;vertical-align:top;width:100%">
                                                        <tbody>
                                                            <tr style="padding:0;text-align:left;vertical-align:top">
                                                                <th style="Margin:0;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;padding:0;text-align:left">
                                                                    <h1 style="Margin:0;Margin-bottom:20px;color:inherit;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:32px;font-weight:700;line-height:1.4;margin:0;margin-bottom:20px;padding:0;text-align:left;word-wrap:normal">
                                                                        '.$title.'</h1>
                                                                    <p class="lead" style="Margin:0;Margin-bottom:20px;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:20px;font-weight:400;line-height:1.6;margin:0;margin-bottom:20px;padding:0;text-align:left">
                                                                        '.$body.'</p>
                                                                    <p style="Margin:0;Margin-bottom:20px;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;margin-bottom:20px;padding:0;text-align:left">
                                                                        '.$bodyNote.'</p>
                                                                    <p style="Margin:0;Margin-bottom:20px;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;;;;;;;;;;margin: 40  0 0 0;;;;;;;;;;;;;;;;;;;;padding:0;;;;;;;;;;;;text-align: center;;;;;;;;;;;;;;;;;;;;;">
                                                                        <a href="'.$moreLink.'" class="btn btn-md  c-white" style="/* margin:auto; */background-color: #9389FF;cursor: pointer;padding: .8rem .7rem;font-size: 0.75rem;border-radius: 0.3rem;display: inline-block;text-align: center;vertical-align: middle;transition: all .15s ease-in-out;text-decoration: none;color: white;/* left: 500px; */">'.$actionText.'</a>
                                                                    </p>
                                                                </th>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </th>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <p style="Margin:0;Margin-bottom:20px;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;margin-bottom:20px;padding:0;;/* text-align:left; */;;;/* margin: auto; */;;;">
                    </p>
                    <table bgcolor="#918afd" align="center" class="wrapper light-section float-center" style="Margin:0 auto;background:#918afd;border-collapse:collapse;border-spacing:0;float:none;margin:0 auto;padding:0;text-align:center;vertical-align:top;width:100%">
                        <tbody>
                            <tr style="color:#1d1d1d;padding:0;text-align:left;vertical-align:top">
                                <td class="wrapper-inner" style="-moz-hyphens:auto;-webkit-hyphens:auto;Margin:0;border-collapse:collapse!important;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;hyphens:auto;line-height:1.4;margin:0;padding:0;text-align:left;vertical-align:top;word-wrap:break-word">
                                    <table class="spacer" style="border-collapse:collapse;border-spacing:0;color:#9c9898;padding:0;text-align:left;vertical-align:top;width:100%">
                                        <tbody style="color:#1d1d1d">
                                            <tr style="color:#1d1d1d;padding:0;text-align:left;vertical-align:top">
                                                <td height="40px" style="-moz-hyphens:auto;-webkit-hyphens:auto;Margin:0;border-collapse:collapse!important;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:40px;font-weight:400;hyphens:auto;line-height:40px;margin:0;mso-line-height-rule:exactly;padding:0;text-align:left;vertical-align:top;word-wrap:break-word">
                                                    &nbsp;</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table align="center" class="container" style="Margin:0 auto;background:0 0;border-collapse:collapse;border-spacing:0;color:#1d1d1d;margin:0 auto;padding:0;text-align:inherit;vertical-align:top;width:800px">
                                        <tbody style="color:#1d1d1d">
                                            <tr style="color:#1d1d1d;padding:0;text-align:left;vertical-align:top">
                                                <td style="-moz-hyphens:auto;-webkit-hyphens:auto;Margin:0;border-collapse:collapse!important;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;hyphens:auto;line-height:1.4;margin:0;padding:0;text-align:left;vertical-align:top;word-wrap:break-word">
                                                    <table class="row" style="border-collapse:collapse;border-spacing:0;color:#1d1d1d;display:table;padding:0;position:relative;text-align:left;vertical-align:top;width:100%">
                                                        <tbody style="color:#1d1d1d">
                                                            <tr style="color:#1d1d1d;padding:0;text-align:left;vertical-align:top">
                                                                <th class="small-12 large-6 columns first" style="Margin:0 auto;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0 auto;padding:0;padding-bottom:40px;padding-left:40px;padding-right:20px;text-align:left;width:360px">
                                                                    <table style="border-collapse:collapse;border-spacing:0;color:#1d1d1d;padding:0;text-align:left;vertical-align:top;width:100%">
                                                                        <tbody>
                                                                            <tr style="color:#1d1d1d;padding:0;text-align:left;vertical-align:top">
                                                                                <th style="Margin:0;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;padding:0;text-align:left">
                                                                                    <h3 style="Margin:0;Margin-bottom:20px;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:21px;font-weight:700;line-height:1.4;margin:0;margin-bottom:20px;padding:0;text-align:left;word-wrap:normal">
                                                                                        Influencer Proposals</h3>
                                                                                    <p style="Margin:0;Margin-bottom:20px;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;margin-bottom:20px;padding:0;text-align:left">
                                                                                        Brands accept or reject proposals from influencers. We make sure you get what you’re paying for.</p>
                                                                                    <p style="Margin:0;Margin-bottom:20px;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;margin-bottom:20px;padding:0;text-align:left">
                                                                                        <a href="https://www.runwaeapparel.com" style="Margin:0;color:#003349;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-weight:400;line-height:1.4;margin:0;padding:0;text-align:left;text-decoration:none"></a>
                                                                                    </p>
                                                                                </th>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </th>
                                                                <th class="small-12 large-6 columns last" style="Margin:0 auto;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0 auto;padding:0;padding-bottom:40px;padding-left:20px;padding-right:40px;text-align:left;width:360px">
                                                                    <table style="border-collapse:collapse;border-spacing:0;color:#1d1d1d;padding:0;text-align:left;vertical-align:top;width:100%">
                                                                        <tbody>
                                                                            <tr style="color:#1d1d1d;padding:0;text-align:left;vertical-align:top">
                                                                                <th style="Margin:0;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;padding:0;text-align:left">
                                                                                    <h3 style="Margin:0;Margin-bottom:20px;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:21px;font-weight:700;line-height:1.4;margin:0;margin-bottom:20px;padding:0;text-align:left;word-wrap:normal">
                                                                                        Clean and Secure</h3>
                                                                                    <p style="Margin:0;Margin-bottom:20px;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;margin-bottom:20px;padding:0;text-align:left">
                                                                                        Runwae uses Stripe to
                                                                                        deliver payments to
                                                                                        influencers quickly and
                                                                                        securely. The agreement
                                                                                        process is designed to
                                                                                        ensure satisfaction for all
                                                                                        parties.</p>

                                                                                </th>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </th>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    <table class="row" style="border-collapse:collapse;border-spacing:0;color:#1d1d1d;display:table;padding:0;position:relative;text-align:left;vertical-align:top;width:100%">
                                                        <tbody style="color:#1d1d1d">
                                                            <tr style="color:#1d1d1d;padding:0;text-align:left;vertical-align:top">
                                                                <th class="small-12 large-6 columns first" style="Margin:0 auto;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0 auto;padding:0;padding-bottom:40px;padding-left:40px;padding-right:20px;text-align:left;width:360px">
                                                                    <table style="border-collapse:collapse;border-spacing:0;color:#1d1d1d;padding:0;text-align:left;vertical-align:top;width:100%">
                                                                        <tbody>
                                                                            <tr style="color:#1d1d1d;padding:0;text-align:left;vertical-align:top">
                                                                                <th style="Margin:0;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;padding:0;text-align:left">
                                                                                    <h3 style="Margin:0;Margin-bottom:20px;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:21px;font-weight:700;line-height:1.4;margin:0;margin-bottom:20px;padding:0;text-align:left;word-wrap:normal">
                                                                                        Influencer Network</h3>
                                                                                    <p style="Margin:0;Margin-bottom:20px;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;margin-bottom:20px;padding:0;text-align:left">
                                                                                        Collaborate with brands all
                                                                                        over on the Runwae platform.
                                                                                        Spread your message through
                                                                                        meaningul partnerships.</p>
                                                                                    <p style="Margin:0;Margin-bottom:20px;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;margin-bottom:20px;padding:0;text-align:left">
                                                                                        <a href="https://Runwae.com" style="Margin:0;color:#003349;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-weight:400;line-height:1.4;margin:0;padding:0;text-align:left;text-decoration:none"></a>
                                                                                    </p>
                                                                                </th>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </th>
                                                                <th class="small-12 large-6 columns last" style="Margin:0 auto;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0 auto;padding:0;padding-bottom:40px;padding-left:20px;padding-right:40px;text-align:left;width:360px">
                                                                    <table style="border-collapse:collapse;border-spacing:0;color:#1d1d1d;padding:0;text-align:left;vertical-align:top;width:100%">
                                                                        <tbody>
                                                                            <tr style="color:#1d1d1d;padding:0;text-align:left;vertical-align:top">
                                                                                <th style="Margin:0;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;padding:0;text-align:left">
                                                                                    <h3 style="Margin:0;Margin-bottom:20px;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:21px;font-weight:700;line-height:1.4;margin:0;margin-bottom:20px;padding:0;text-align:left;word-wrap:normal">
                                                                                        Latest Opportunities</h3>
                                                                                    <p style="Margin:0;Margin-bottom:20px;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;margin-bottom:20px;padding:0;text-align:left">
                                                                                        Find the latest
                                                                                        opportunities on several
                                                                                        social media platforms. Post
                                                                                        opportunities and select who
                                                                                        you want to work with.
                                                                                        Create your profile in just
                                                                                        minutes!</p>
                                                                                    <p style="Margin:0;Margin-bottom:20px;color:#1d1d1d;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;margin-bottom:20px;padding:0;text-align:left">
                                                                                        <a href="https://Runwae.com" style="Margin:0;color:#003349;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-weight:400;line-height:1.4;margin:0;padding:0;text-align:left;text-decoration:none"></a>
                                                                                    </p>
                                                                                </th>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </th>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>

                                </td>

                            </tr>

                        </tbody>

                    </table>
                    <table style="
background: #918afd;
text-align: center;
width: 100%;
">
                        <tbody>
                            <tr>
                                <td><a href="https://runwae.com" class="btn btn-md  c-white" style="margin:auto;background-color: #1e1e1e;cursor: pointer;padding: .8rem .7rem;font-size: 0.75rem;border-radius: 0.3rem;display: inline-block;text-align: center;vertical-align: middle;transition: all .15s ease-in-out;text-decoration: none;color: white;margin-bottom: 40px;">Get
                                        Started!</a></td>
                            </tr>
                        </tbody>
                    </table>
                    <table align="center" class="wrapper float-center" style="Margin:0 auto;border-collapse:collapse;border-spacing:0;float:none;margin:0 auto;padding:0;text-align:center;vertical-align:top;width:100%">
                        <tbody>
                            <tr style="padding:0;text-align:left;vertical-align:top">
                                <td class="wrapper-inner" style="-moz-hyphens:auto;-webkit-hyphens:auto;Margin:0;border-collapse:collapse!important;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;hyphens:auto;line-height:1.4;margin:0;padding:0;text-align:left;vertical-align:top;word-wrap:break-word">
                                    <table class="spacer" style="border-collapse:collapse;border-spacing:0;padding:0;text-align:left;vertical-align:top;width:100%">
                                        <tbody>
                                            <tr style="padding:0;text-align:left;vertical-align:top">
                                                <td height="40px" style="-moz-hyphens:auto;-webkit-hyphens:auto;Margin:0;border-collapse:collapse!important;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:40px;font-weight:400;hyphens:auto;line-height:40px;margin:0;mso-line-height-rule:exactly;padding:0;text-align:left;vertical-align:top;word-wrap:break-word">
                                                    &nbsp;</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table align="center" class="container" style="Margin:0 auto;background:0 0;border-collapse:collapse;border-spacing:0;margin:0 auto;padding:0;text-align:inherit;vertical-align:top;width:800px">
                                        <tbody>
                                            <tr style="padding:0;text-align:left;vertical-align:top">
                                                <td style="-moz-hyphens:auto;-webkit-hyphens:auto;Margin:0;border-collapse:collapse!important;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;hyphens:auto;line-height:1.4;margin:0;padding:0;text-align:left;vertical-align:top;word-wrap:break-word">
                                                    <table class="row" style="border-collapse:collapse;border-spacing:0;display:table;padding:0;position:relative;text-align:left;vertical-align:top;width:100%">
                                                        <tbody>
                                                            <tr style="padding:0;text-align:left;vertical-align:top">
                                                                <th class="small-12 large-12 columns first last" style="Margin:0 auto;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0 auto;padding:0;padding-bottom:40px;padding-left:40px;padding-right:40px;text-align:left;width:760px">
                                                                    <table style="border-collapse:collapse;border-spacing:0;padding:0;text-align:left;vertical-align:top;width:100%">
                                                                        <tbody>
                                                                            <tr style="padding:0;text-align:left;vertical-align:top">
                                                                                <th style="Margin:0;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;padding:0;text-align:left">
                                                                                    <img src="https://runwae.com/img/emailfooter.png" alt="Runwae logo" width="100" height="22" style="-ms-interpolation-mode:bicubic;clear:both;display:block;max-width:100%;outline:0;text-decoration:none;width:auto">
                                                                                </th>
                                                                                <th class="expander" style="Margin:0;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;padding:0!important;text-align:left;visibility:hidden;width:0">
                                                                                </th>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </th>
                                                            </tr>
                                                        </tbody>
                                                        <tbody>
                                                            <tr style="padding:0;text-align:left;vertical-align:top">
                                                                <th class="small-12 large-12 columns first last" style="Margin:0 auto;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0 auto;padding:0;padding-bottom:40px;padding-left:40px;padding-right:40px;text-align:left;width:760px">
                                                                    <div style="Margin:0;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;;;;;;;;;;;;;;;padding:0;;;text-align:left;;;;;display: flex;;;;;;">

                                                                        <a href="https://www.facebook.com/runwaeplatform" style="
margin: 0 10px;
"><img src="https://cdn1.iconfinder.com/data/icons/social-media-rounded-corners/512/Rounded_Facebook_svg-512.png" alt="Runwae logo" width="" height="22" style="-ms-interpolation-mode:bicubic;clear:both;display:block;/* max-width:100%; */outline:0;text-decoration:none;width:auto;margin: 0 10px;"></a><a href="#" style="
margin: 0 10px;
"><img href="instagram.com/runwae_" src="https://cdn1.iconfinder.com/data/icons/social-media-rounded-corners/512/Rounded_Instagram_svg-512.png" alt="Runwae logo" width="" height="22" style="-ms-interpolation-mode:bicubic;clear:both;display:block;/* max-width:100%; */outline:0;text-decoration:none;width:auto;margin: 0 10px;"></a><a href="https://twitter.com/runwae_" style="
margin: 0 10px;
"><img src="https://cdn1.iconfinder.com/data/icons/social-media-rounded-corners/512/Rounded_Twitter5_svg-512.png" alt="Runwae logo" width="" height="22" style="-ms-interpolation-mode:bicubic;clear:both;display:block;/* max-width:100%; */outline:0;text-decoration:none;width:auto;margin: 0 10px;"></a><a href="#" style="
margin: 0 10px;
"><img href="pinterest.com/runwae" src="https://cdn1.iconfinder.com/data/icons/social-media-rounded-corners/512/Rounded_Pinterest2_svg-512.png" alt="Runwae logo" width="" height="22" style="-ms-interpolation-mode:bicubic;clear:both;display:block;/* max-width:100%; */outline:0;text-decoration:none;width:auto;margin: 0 10px;"></a><a href="https://www.linkedin.com/company/35692617" style="
margin: 0 10px;
"><img src="https://cdn1.iconfinder.com/data/icons/social-media-rounded-corners/512/Rounded_Linkedin2_svg-512.png" alt="Runwae logo" width="" height="22" style="-ms-interpolation-mode:bicubic;clear:both;display:block;/* max-width:100%; */outline:0;text-decoration:none;width:auto;margin: 0 10px;"></a>
                                                                    </div>
                                                                    <table style="border-collapse:collapse;border-spacing:0;padding:0;text-align:left;vertical-align:top;width:100%;">
                                                                        <tbody>
                                                                            <tr style="padding:0;text-align:left;vertical-align:top">

                                                                                <th class="expander" style="Margin:0;color:#fefefe;font-family:\'Work Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif,\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Segoe UI Symbol\';font-size:16px;font-weight:400;line-height:1.4;margin:0;padding:0!important;text-align:left;visibility:hidden;width:0">
                                                                                </th>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </th>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </center>
            </td>
        </tr>
    </tbody>
</table><!-- prevent Gmail on iOS font size manipulation -->
<div style="display:none;white-space:nowrap;font:15px courier;line-height:0">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
    &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
    &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</div>










</body></html>';


//parse message
$string = $message;
$message = delete_all_between('"<', '>"', $string);
echo $message;

//////////////////////////////////////////////////////////

$headers = "MIME-Version: 1.0" . "\r\n";
$headers.= "Content-type:text/html;charset=UTF-8" . "\r\n";
$headers.= 'From: <team@runwae.com>' . "\r\n";

$send = true; if ($subject == "You have a notification on Runwae!"){ if(rand(1,3) > 1){ $send = false; } }
$send = true;
if ($send == true){
    mail($to, $subject, $message, $headers);
}

function delete_all_between($beginning, $end, $string) {
  $beginningPos = strpos($string, $beginning);
  $endPos = strpos($string, $end);
  if ($beginningPos === false || $endPos === false) {
    return $string;
  }

  $textToDelete = substr($string, $beginningPos, ($endPos + strlen($end)) - $beginningPos);

  return delete_all_between($beginning, $end, str_replace($textToDelete, '', $string)); // recursion to ensure all occurrences are replaced
}
  
  
?>
