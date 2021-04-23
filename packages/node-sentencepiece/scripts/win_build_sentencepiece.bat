echo "starting to build sentencepiece for windows"
set currentDir=%cd%

call .\scripts\win_sentencepiece_builder.bat

echo "finished building. Preparing to copy library"
cd %currentDir%
echo F | xcopy .\sentencepiece\build\src\Release\sentencepiece.lib .\bin\sentencepiece_lib.lib /Y