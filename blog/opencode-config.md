# Opencode com mais privacidade

Essas são as configurações que uso com Opencode:

## Alias (bash/zsh)

```bash
alias opencode='cd /sdc/HD/Opencode && opencode --agent plan'
```

`/sdc/HD/Opencode`: diretório que sempre irá abrir o Opencode.

## opencode.json

Na raiz desse diretório:

```bash
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "build": { "disable": true }
  },
  "permission": {
    "edit": "ask",
    "bash": "ask",
    "task": "ask",
    "external_directory": { "*": "deny" }
  }
}
```

### O que cada ajuste faz

**Pasta dedicada:** o agente só enxerga `/sdc/HD/Opencode`, não o sistema inteiro. A regra `external_directory: deny` reforça esse bloqueio.

**Sem build:** `build.disable: true` impede que ele execute scripts de compilação sem supervisão.

**Permissões manuais:** com `edit: ask` e `bash: ask`, cada modificação ou comando passa por você antes de rodar.

**Plan mode:** `--agent plan` faz ele primeiro ler e propor um plano antes de qualquer alteração.

Com esses ajustes, ganho um sandboxing básico sem precisar de container. É uma camada extra de segurança.

## Links

**Opencode:** [opencode.ai](https://opencode.ai)

---

`$ echo "até logo"` 