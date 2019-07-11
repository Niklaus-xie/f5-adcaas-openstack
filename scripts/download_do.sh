#!/bin/bash 

# TODO: make /var/tmp/ASGExtensions and filelist configurable.
filelist="https://github.com/F5Networks/f5-declarative-onboarding/releases/download/v1.5.0/f5-declarative-onboarding-1.5.0-11.noarch.rpm"
target="F5_DO_RPM_PACKAGE.rpm"
mkdir -p /tmp/DO

(
    cd /tmp/DO
    if [ ! -f F5_DO_RPM_PACKAGE.rpm ]; then 
	wget $filelist
	mv `basename $filelist` $target
   fi
)

