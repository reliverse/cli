// utils.go

package main

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
)

// Function to find the next available directory name
func findNextAvailableDir(baseDir string) string {
    dirName := baseDir
    counter := 1
    for {
        if _, err := os.Stat(dirName); os.IsNotExist(err) {
            break
        }
        dirName = fmt.Sprintf("%s-%d", baseDir, counter)
        counter++
    }
    return dirName
}

// Function to open a URL using the default web browser
func openURL(url string) error {
    var err error
    switch runtime.GOOS {
    case "windows":
        err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
    case "darwin":
        err = exec.Command("open", url).Start()
    default:
        err = exec.Command("xdg-open", url).Start()
    }
    return err
}
