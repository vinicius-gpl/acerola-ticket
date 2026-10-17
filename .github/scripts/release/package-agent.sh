#!/usr/bin/env bash
# O MSI é criado no Linux com msitools; a assinatura e o teste real ficam no Windows.
set -euo pipefail
version="${1:?Pass the release version}"
[[ "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || exit 1
root="$(git rev-parse --show-toplevel)"
source_dir="$root/acerola/agent/build/windows/installer"
mkdir -p "$root/release"
msi="$root/release/acerola-agent-$version-x64.msi"
wixl -a x64 -D "Version=$version" -D "BinDir=$root/agent-bin" -D "SourceDir=$source_dir" "$source_dir/agent.wxs" -o "$msi"
# Completa campos que wixl não preenche; o MSI compilado é conferido ao final.
msibuild "$msi" -s 'Acerola Agent' 'Acerola' 'x64;1046'
msibuild "$msi" -q "UPDATE \`ServiceInstall\` SET \`ErrorControl\` = 32769 WHERE \`ServiceInstall\` = 'InstallService'"
# wixl não expõe Schedule no MajorUpgrade: remove a versão antiga dentro da transação,
# após InstallInitialize. Se a instalação falhar, o Windows Installer pode revertê-la.
msibuild "$msi" -q 'UPDATE `InstallExecuteSequence` SET `Sequence` = 1501 WHERE `Action` = '\''RemoveExistingProducts'\'''
# Tabela padrão do MSI 5: fecha a pasta da máquina antes de iniciar qualquer serviço.
table_dir="$(mktemp -d)"
acl_table="$table_dir/MsiLockPermissionsEx.idt"
trap 'rm -rf "$table_dir"' EXIT
printf 'MsiLockPermissionsEx\tLockObject\tTable\tSDDLText\tCondition\ns72\ts72\ts32\tl0\tS255\nMsiLockPermissionsEx\tMsiLockPermissionsEx\nSecureAgentData\tAGENTDATA\tCreateFolder\tO:SYG:SYD:P(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)\t\n' > "$acl_table"
msibuild "$msi" -i "$acl_table"
cp "$source_dir/install-certificate.ps1" "$source_dir/configure-machine.ps1" "$root/release/"
# A ação padrão de processo fecha a bandeja antes da remoção dos arquivos. A falha
# é ignorada quando ninguém está logado; o serviço é parado pelo ServiceControl.
printf 'Action\tType\tSource\tTarget\n%s\n%s\n%s\n' 's72	i2	S72	S255' 'CustomAction	Action' 'CloseTray	3170	SystemFolder	"[SystemFolder]taskkill.exe" /F /IM "Acerola Agent.exe"' > "$table_dir/CustomAction.idt"
msibuild "$msi" -i "$table_dir/CustomAction.idt"
msibuild "$msi" -q 'INSERT INTO `InstallExecuteSequence` (`Action`, `Condition`, `Sequence`) VALUES ('\''CloseTray'\'', '\''1'\'', 1901)'
node "$root/.github/scripts/release/check-msi.mjs" "$msi" "$version"
