#!/usr/bin/bash

trap catch INT

date=$(date --utc +"%Y-%m-%dT%H:%M:%S")


function print_style
{
	if   [ "$1" == "info"    ]; then COLOR="96m";
	elif [ "$1" == "success" ]; then COLOR="92m";
	elif [ "$1" == "warning" ]; then COLOR="93m";
	elif [ "$1" == "danger"  ]; then COLOR="91m";
	else                             COLOR="0m";
	fi
	STARTCOLOR="\e[$COLOR";
	ENDCOLOR="\e[0m";
	printf "$STARTCOLOR%b$ENDCOLOR" "$2";
}








function initialize
{
	# starting testrpc
	print_style 'info' "Starting testrpc daemon in a tmux session\n"
	tmux new-session -s testrpc -d script -f /tmp/testrpc.$date.log -c testrpc || exit 1
}
function finalize
{
	# stopping testrpc
	print_style 'info' "Stoping testrpc daemon\n"
	tmux kill-session -t testrpc || exit 1
}

function catch
{
	print_style 'warning' "\n*** Killing test suite ***\n"
	finalize
	exit 1
}

function runCompile
{
	# compile contracts
	logcompile="log/compile.$date.log"
	printf "Compiling ... "
	truffle compile > $logcompile 2>&1
	if [[ $? -ne 0 ]];
	then
		print_style 'danger'  "failure\n"
		print_style 'warning' "Full report is available at $logcompile\n"
		break
	else
		print_style 'success' "success\n"
	fi
}

function runDeploy
{
	# try deploying contracts
	logdeploy="log/deploy.$date.log"
	printf "Deploying ... "
	truffle deploy > $logdeploy 2>&1
	if [[ $? -ne 0 ]];
	then
		print_style 'danger'  "failure\n"
		print_style 'warning' "Full report is available at $logcompile\n"
		break
	else
		print_style 'success' "success\n"
	fi
}

function runTests
{
	# running tests
	for filepath in `find test/ -maxdepth 1 -type f -name "*.js" -print | sort`
	do
		filename=$(basename $filepath)
		logfile="log/${filename%.*}.$date.log"

		if [ "$1" \> "$filename" ]; then continue; fi

		printf "Starting test ${filename%.*} ... "
		truffle test $filepath > $logfile 2>&1
		if [[ $? -ne 0 ]];
		then
			print_style 'danger'  "failure\n"
			print_style 'warning' "Full report is available at $logcompile\n"
			break
		else
			print_style 'success' "success\n"
		fi
	done
}

# MAIN
initialize
runCompile
runDeploy
runTests "$1"
finalize
