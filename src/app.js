/*eslint-disable no-unused-vars, no-param-reassign*/

var zs = require('zerosense');

var Logger = require('zerosense/Logger');
var MemoryReader = require('zerosense/MemoryReader');
var Searcher = require('zerosense/Searcher');
var Offsets = require('zerosense/Offsets');
var Util = require('zerosense/Util');
var ZsArray = require('zerosense/ZsArray');

var ZsHelper = require('zerosense/helper/ZsHelper');
var FileSystem = require('zerosense/helper/FileSystem');

var HelperTest = require('./HelperTest.js');


var logger = null;


(function() {
	try {		
		var ua = navigator.userAgent;
		
		zs.environment = {};
		zs.environment.ps3 = ua.indexOf("PLAYSTATION 3") !== -1;
		zs.environment.firmware = zs.environment.ps3 ? ua.substr(ua.indexOf("PLAYSTATION 3") + 14, 4)
				: "0.00";
		zs.environment.dex = false;
	
		var log = document.getElementById("log");
		if (log === null) {
			throw new Error("Log element not found.");
		}
	
		logger = zs.logger = new Logger(log);
	} catch (e) {
		alert(e);
		console.error(e, e.name, e.stack);
		return;
	}
	
	try {
		logger.clear();
	
		if (zs.environment.ps3) {
			logger.info(`Detected a PS3 on FW ${zs.environment.firmware} ${zs.environment.dex ? 'DEX' : 'CEX'}.`);
		} else {
			logger.info("No PS3 detected. May not work as expected.");
		}
		
		zs.memoryReader = new MemoryReader();
		zs.searcher = new Searcher(zs.memoryReader);
		zs.offsets = Offsets.get(zs.environment);
		
		Promise.resolve()
			.then(() => ZsHelper.initZsArray())
			.then(() => {
				var buttonFolderTest = document.getElementById("buttonFolderTest");
				buttonFolderTest.addEventListener("click", () => folderTest());
		          
				startFileManager();
			})
			.catch((error) => logger.error(`Error while starting. ${error}`));;
	} catch (e) {
		if (zs.environment.ps3) {
			alert(e);
		}
		console.error(e, e.name, e.stack);
	}	
})();


///////////////////////////////////////

function folderTest() {
	logger.info("Folder test...");
	
	/*Promise.resolve()
		.then(() => {
			var result = HelperTest.malloc(0x10000);
			var ptr = result.ptr;
			logger.debug(`ptr: 0x${ptr.toString(16)}`);
			
			HelperTest.free(ptr);
			logger.debug(`freed`);
		})
		.then(() => logger.info("Folder test done."))
		.catch((error) => {
			logger.error(`Error while running folder test. ${error}`);
			console.error(error);
		});*/
	
	Promise.resolve()
		.then(() => {
		    var result = FileSystem.chmod("/dev_usb000/PIC1.PNG", 0o777);
        	var errno = result.errno;
        	logger.debug(`Errno: 0x${errno.toString(16)}`);
		})
		.then(() => logger.info("Folder test done."))
		.catch((error) => {
			logger.error(`Error while running folder test. ${error}`);
			console.error(error);
		});
}

///////////////////////////////////////

var fm_pathElem = $("#fm-path");
var fm_pathGoElem = $("#fm-path-go");
var fm_entriesElem = $("#fm-entries");

var fm_path = "";


function startFileManager() {
	logger.info("Starting file manager...");
	
	Promise.resolve()
		.then(() => {
			fm_pathGoElem.click(function() {
				var path = fm_pathElem.val();
				fm_goToPath(path);
			});
			
			fm_goToPath("/");
		})
		.then(() => logger.info("Started file manager."))
		.catch((error) => logger.error(`Error while starting file manager. ${error}`));
}

function fm_goToPath(path) {
	logger.debug(`fm_goToPath: ${path}`);
	
	if (path.substr(path.length - 3) === "../") {
		path = path.substr(0, path.substr(0, path.length - 4).lastIndexOf("/") + 1);
	}
	
	var result = fm_getDirEntries(path);
	if (result.errno === 0) {
		var entriesSorted = result.entries.sort(function(a, b) {
			if (a.type < b.type) {
				return -1;
			} else if (a.type > b.type) {
				return 1;
			}
			if (a.name < b.name) {
				return -1;
			} else if (a.name > b.name) {
				return 1;
			}
			return 0;
		});
		
		fm_entriesElem.empty();
		
		for (var i = 0; i < entriesSorted.length; i++) {
			var entry = entriesSorted[i];
			fm_addEntry(entry.type, entry.name);
		}
		
		fm_path = path;
	}
	
	fm_pathElem.val(fm_path);
}

function fm_getDirEntries(path) {
	logger.debug(`fm_getDirEntries: ${path}`);
	
	/*return { errno: 0, entries: [
		{ type: 1, name: "dev_hdd0" }
	]};*/
	
	var result = FileSystem.opendir(path);
	var errno = result.errno;
	var fd = result.fd;
	logger.debug(`Errno: 0x${errno.toString(16)}`);
	
	var entries = [];
	
	if (errno === 0) {
		var name = "";
		var type = 0;
		do {
			result = FileSystem.readdir(fd);
			errno = result.errno;
			type = result.type;
			name = result.name;
			if (name.length === 0) {
				break;
			}
			entries.push({ type: type, name: name });
		} while (name.length > 0);
		
		result = FileSystem.closedir(fd);
		errno = result.errno;
	}
	
	return { errno: errno, entries: entries };
}

function fm_onEntryOptionsClicked(event) {
	logger.debug(`fm_onEntryOptionsClicked: ${event.data}`);
	
	var elem = $(event.target);
	elem.parent().parent().find(".fm-entry-options-menu").toggleClass("active");
}

function fm_onEntryOptionCopy(event) {
	Promise.resolve()
		.then(() => {
			logger.debug("fm_onEntryOptionCopy...")
			
			var name = event.data;
			var pathFrom = fm_path + name;
			var pathTo = "/dev_usb000/" + name;
			
			fileCopy(pathFrom, pathTo);
		})
		.then(() => logger.info("fm_onEntryOptionCopy done."))
		.catch((error) => {
			logger.error(`fm_onEntryOptionCopy error. ${error}`);
		});
}

function fm_onEntryFolderClicked(event) {
	var path = fm_path + event.data + "/";
	fm_goToPath(path);
}

function fm_addEntry(type, name) {    
	if (type !== 1 || name !== ".") {
		var elemOptions = $("<a href=\"#\">&times;</a>").click(name, fm_onEntryOptionsClicked);
		
		var elemOptionsButton = $("<div class=\"fm-entry-options-button\"></div>");
		elemOptionsButton.append(elemOptions);
		
		if (type === 2) {
			var elemOptionsCopy = $("<a href=\"#\">Copy</a>").click(name, fm_onEntryOptionCopy);
		}
		
		var elemOptionsMenu = $("<div class=\"fm-entry-options-menu\"></div>");
		elemOptionsMenu.append(elemOptionsCopy);
		
		var elemOptionsCol = $("<td class=\"fm-entry-options-container\"></td>");
		elemOptionsCol.append(elemOptionsButton);
		elemOptionsCol.append(elemOptionsMenu);
		
		var elemEntry = null; 
		if (type === 1) {
			if (name === "..") {
				elemEntry = $("<a href=\"#\">" + name + "</a>").click(name, fm_onEntryFolderClicked);
			} else {
				elemEntry = $("<a href=\"#\">" + name + "/</a>").click(name, fm_onEntryFolderClicked);
			}
		} else {
			elemEntry = $("<span>" + name + "</span>");
		}
		
		var elemEntryCol = $("<td></td>");
		elemEntryCol.append(elemEntry);
		
		var elemTableRow = $("<tr></tr>");
		elemTableRow.append(elemOptionsCol);
		elemTableRow.append(elemEntryCol);
		
		fm_entriesElem.append(elemTableRow);
	}
}

/** 
 * try to use malloc() or something similar to allocate our buffer,
 * then read/write to that instead.
 * 
 * this works, but still a bit slow...
 * if we could allocate a buffer for our read/write chains, we could
 * reuse those as well, and it should speed up the transfer.
 * 
 * for some reason, reusing the chains how I initally thought doesn't work.
 * 
 * If we malloc them instead, there's no reason they shouldn't work.
 */

function fileCopy(fromPath, toPath) {
	logger.debug(`File copy: ${fromPath} -> ${toPath}`);
	
	var bufferSize = 0x8000;
	
	var result = HelperTest.malloc(bufferSize);
	var bufptr = result.ptr;
	logger.debug(`bufptr: 0x${bufptr.toString(16)}`);
	
	if (bufptr === 0x0) {
	    logger.debug(`bufptr is null`);
	    return;
	}
	
	result = FileSystem.open(fromPath, 0o102, 0o777);
	var errno = result.errno;
	var fromFd = result.fd;
	logger.debug(`Errno: 0x${errno.toString(16)}`);
	logger.debug(`Fd: 0x${fromFd.toString(16)}`);
	
	result = FileSystem.open(toPath, 0o102, 0o777);
	errno = result.errno;
	var toFd = result.fd;
	logger.debug(`Errno: 0x${errno.toString(16)}`);
	logger.debug(`Fd: 0x${toFd.toString(16)}`);
	
	result = FileSystem.fstat(fromFd);
	errno = result.errno;
	var sb = result.sb;
	
	var fileSize = Util.getint32(sb, 0x28);
	logger.debug(`filesize: 0x${fileSize.toString(16)}`);
	
	var timeStart = new Date().getTime();
	
    _fileCopy({ totalRead: 0, fileSize, timeStart,
        fromFd, toFd, bufptr, bufferSize }).then((r) => {
        var time = new Date().getTime();
    	time -= timeStart;
    	logger.info(`Took ${time} ms`);
    	
    	result = FileSystem.close(toFd);
    	errno = result.errno;
    	logger.debug(`Errno: 0x${errno.toString(16)}`);
    	
    	result = FileSystem.close(fromFd);
    	errno = result.errno;
    	logger.debug(`Errno: 0x${errno.toString(16)}`);
    	
    	result = FileSystem.chmod(toPath, 0o777);
    	errno = result.errno;
    	logger.debug(`Errno: 0x${errno.toString(16)}`);
    	
    	HelperTest.free(bufptr);
    	logger.debug(`freed bufptr`);
    });	
}

function _fileCopy(r) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(r), 1);
    }).then((r) => {
        if (r.totalRead < r.fileSize) {
    		var result = FileSystem.readPtr(r.fromFd, r.bufptr, r.bufferSize);
    		var errno = result.errno;
    		var read = result.read;
    		var buffer = result.buffer;
    		logger.debug(`Errno: 0x${errno.toString(16)}`);
    		logger.debug(`Read: 0x${read.toString(16)}`);
    		logger.debug(`bufptr: 0x${r.bufptr.toString(16)}`);
    		
    		if (errno !== 0) {
    			return r;
    		}
    		
    		if (read === 0) {
    			logger.debug(`read 0 bytes`);
    			return r;
    		}
    		
    		result = FileSystem.writePtr(r.toFd, r.bufptr, read);
    		errno = result.errno;
    		var written = result.written;
    		logger.debug(`Errno: 0x${errno.toString(16)}`);
    		logger.debug(`Written: 0x${written.toString(16)}`);
    		
    		if (errno !== 0) {
    			return r;
    		}
    		
    		if (written !== read) {
    			logger.debug(`didn't write all read bytes`);
    			return r;
    		}
    		
    		r.totalRead += read;
    		
    		var time = new Date().getTime();
    		time -= r.timeStart;
    		var rate = r.totalRead / time;
    		var rate2 = rate / 1000;
    		logger.info(`... ${rate.toFixed(2)} kB/s    ${rate2.toFixed(2)} MB/s`);
    		
    		return _fileCopy(r);
        }
        
        return r;
    });
}