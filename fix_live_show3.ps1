$content = Get-Content 'c:/Users/justk/OneDrive/Desktop/MaiTalent/src/pages/LiveShowPage.tsx' -Raw
# Remove the broken line 197-199 (the old isShowLive declaration)
$content = $content -replace '(// Check if show is live\r?\n  const isShowLive = showState .*?\|\| showWinner\r?\n\r?\n)', ''
# Fix the corrupted line 209 
$content = $content -replace '(\r?\n  const \[isSuddenDeath, setIsSuddenDeath\] = useState\(false\)\r?\n  // Check if show is live\r\n  const isShowLive = showState .*?\|\| showWinner\r?\n\r?\n  const \[)', '$1'
# Add isShowLive AFTER isTimerRunning
$content = $content -replace '(  const \[isTimerRunning, setIsTimerRunning\] = useState\(false\)\r?\n)(  const \[isSuddenDeath)', '$1  // Check if show is live\r\n  const isShowLive = showState === ''live'' || isTimerRunning || showWinner\r\n\r\n$2'
Set-Content -Path 'c:/Users/justk/OneDrive/Desktop/MaiTalent/src/pages/LiveShowPage.tsx' -Value $content -NoNewline
