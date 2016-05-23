#!/usr/bin/env node

/*
    ___ usage ___ en_US ___
    usage: compasssion <arguments> [command <arguments>]

            --help                      display this message

    ___ $ ___ en_US ___

        udp is required:
            the `--udp` address and port is a required argument

        port is not an integer:
            the `--udp` port must be an integer

    ___ . ___
*/
require('arguable')(module, require('cadence')(function (async, program) {
    program.helpIf(program.command.param.help)

    console.log(program.argv)

    program.delegate('compassion', async())
}))
