// main.go

package main

import (
	"fmt"
	"os/exec"

	"github.com/charmbracelet/log"
)

func main() {
    ShowWelcomeMessage()

    if !AskForInstallationConfirmation() {
        fmt.Println("🔴 Installation cancelled.")
        return
    }

    // Find the next available directory name
    dirName := findNextAvailableDir("relivator")
    cmd := exec.Command("git", "clone", "https://github.com/blefnk/relivator", dirName)
    err := cmd.Run()
    if err != nil {
        log.Error("🔴 Failed to clone the https://github.com/blefnk/relivator repository: ", err)
        return
    }
    fmt.Println("✅ Successfully cloned the https://github.com/blefnk/relivator repository into", dirName)

		// Open the Relivator's README if the user wants
    if AskToReadReadme() {
        openReadmeURL := "https://github.com/blefnk/relivator#readme"
        err := openURL(openReadmeURL)
        if err != nil {
            log.Error("🔴 Failed to open the README: ", err)
            return
        }
        fmt.Println("📖 README opened successfully.")
    } else {
        fmt.Println("🔴 Exiting the program.")
        return
    }

    fmt.Println("")
    fmt.Println("⚠️ To be continued... Check back later or please help with code contributions...")
    fmt.Println("")
}
