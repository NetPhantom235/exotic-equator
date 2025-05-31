# Requires PowerShell 7+
param($EnvFile = '.env')

$ErrorActionPreference = 'Stop'

try {
    # Load environment variables
    $envConfig = Get-Content $EnvFile -Raw | ConvertFrom-StringData
    $backupDir = "$PSScriptRoot/../prisma/backups"
    $dbPath = "$PSScriptRoot/../prisma/dev.db"
    $timestamp = Get-Date -Format 'yyyyMMddHHmmss'
    
    # Create backup directory
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir | Out-Null
    }

    # Online backup using VACUUM INTO
    $backupFile = "$backupDir/dev_backup_${timestamp}.db"
    & "$PSScriptRoot/../node_modules/.bin/prisma" db execute --file <(echo "VACUUM INTO '$backupFile';") --env-file $EnvFile

    # Apply encryption to backup
    if ($envConfig.SQLITE_ENCRYPTION_KEY) {
        & "$PSScriptRoot/../node_modules/.bin/prisma" db execute --file <(echo 
            "PRAGMA key='${envConfig.SQLITE_ENCRYPTION_KEY}';
            ATTACH DATABASE '${backupFile}.enc' AS encrypted KEY '${envConfig.SQLITE_ENCRYPTION_KEY}';
            SELECT sqlcipher_export('encrypted');
            DETACH DATABASE encrypted;") --env-file $EnvFile
        Remove-Item $backupFile
        Rename-Item "${backupFile}.enc" $backupFile
    }

    # Apply retention policy
    Get-ChildItem $backupDir -Filter *.db | 
        Sort-Object CreationTime -Descending | 
        Select-Object -Skip $envConfig.BACKUP_RETENTION_DAYS | 
        Remove-Item -Force

    # Log success
    Add-Content -Path "$backupDir/backup.log" -Value "SUCCESS: $(Get-Date) - Created backup ${backupFile}"
}
catch {
    Add-Content -Path "$backupDir/backup.log" -Value "ERROR: $(Get-Date) - ${_}"
    exit 1
}