#!/bin/bash

CMD="ethers-ens --network goerli --account $MNEMONIC --yes --wait"

function cprintf()
{
	span=$(((${2:-$(tput cols)} + ${#1}) / 2))
	printf "%${span}s\n" "$1"
}

function getAddr()
{
	grep Address <<< `$CMD lookup $1` | tr -s ' ' | cut -d' ' -f3
}

function setup()
{
	printf "┌──────────────────────────────────────────────────────────────────────────────┐\n"
	printf "│ %31s → %-42s │\n" $1 $2
	printf "└──────────────────────────────────────────────────────────────────────────────┘\n"

	lookup=`$CMD lookup $1`
	ctrl=`grep Controller <<< $lookup | tr -s ' ' | cut -d' ' -f3`
	rslv=`grep Resolver   <<< $lookup | tr -s ' ' | cut -d' ' -f3`
	addr=`grep Address    <<< $lookup | tr -s ' ' | cut -d' ' -f3`

	[[ -z "$ctrl"      ]] && echo "[set-subnode]"  && $CMD set-subnode  $1              # need to setup subdomain
	[[ -z "$2"         ]] && return                                                     # no addr → no need for a resolver
	[[ -z "$rslv"      ]] && echo "[set-resolver]" && $CMD set-resolver $1              # need to setup a resolver
	[[ "$2" != "$addr" ]] && echo "[set-addr]"     && $CMD set-addr     $1 --address $2 # wrong addr → need update
}

function reset()
{
	printf "┌──────────────────────────────────────────────────────────────────────────────┐\n"
	printf "│ %-76s │\n" "$(cprintf "Reset $1" 76)"
	printf "└──────────────────────────────────────────────────────────────────────────────┘\n"

	lookup=`$CMD lookup $1`
	ctrl=`grep Controller <<< $lookup | tr -s ' ' | cut -d' ' -f3`
	rslv=`grep Resolver   <<< $lookup | tr -s ' ' | cut -d' ' -f3`
	addr=`grep Address    <<< $lookup | tr -s ' ' | cut -d' ' -f3`

	[[ ! -z "$rslv" ]] && echo "[reset-resolver]" && $CMD set-resolver $1 --address 0x0000000000000000000000000000000000000000
	[[ ! -z "$ctrl" ]] && echo "[reset-subnode]"  && $CMD set-subnode  $1 --address 0x0000000000000000000000000000000000000000
}



# Check
$CMD lookup iexec.eth
$CMD lookup rlc.iexec.eth
$CMD lookup hub.v3.iexec.eth
$CMD lookup clerk.v3.iexec.eth
$CMD lookup apps.v3.iexec.eth
$CMD lookup datasets.v3.iexec.eth
$CMD lookup workerpools.v3.iexec.eth
$CMD lookup core.v5.iexec.eth
$CMD lookup apps.v5.iexec.eth
$CMD lookup datasets.v5.iexec.eth
$CMD lookup workerpools.v5.iexec.eth

# Set new pointers
# setup v3.iexec.eth # subnode only
# setup hub.v3.iexec.eth         0x99d8717A84d1E97422d04d9a2a82694038470753
# setup clerk.v3.iexec.eth       0x56d07b25A3A21a6abeFdF777Aaa8F886ECfdB43a
# setup apps.v3.iexec.eth        0x221b9a91320a601b30992610425A960B1949B22d
# setup datasets.v3.iexec.eth    0x8Dc0a7d917aeF68E340DBF68eF4ECB36d1Ca941b
# setup workerpools.v3.iexec.eth 0xdAD30AAb14F569830bFd26EdF72df876dc30D20c
#
# setup v5.iexec.eth # subnode only
# setup core.v5.iexec.eth        0xa95b9C0Faea4D0b0fd250fb14Ba8a4CA4bB6571f
# setup apps.v5.iexec.eth        0x2614177550ECe63DaCF31cE6dc461a5aaC6C23C2
# setup datasets.v5.iexec.eth    0xbcf91a6D92389ad5335D5C23B6c16AAE5a9E9Cf2
# setup workerpools.v5.iexec.eth 0xc4B1B521A76eEfEcb50193DbF0C74D1CCA186F75

# Reset old subdomains
# reset hub.iexec.eth
# reset clerk.iexec.eth
# reset apps.iexec.eth
# reset datasets.iexec.eth
# reset workerpools.iexec.eth
