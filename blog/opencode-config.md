# Opencode com mais privacidade

Se você usa o Opencode como agente de IA no terminal, vale a pena pensar em isolamento. Essa é a config que uso:

## Alias (bash/zsh)

```bash
alias opencode='cd /sdc/HD/Opencode && opencode --agent plan'
```

Troque `/sdc/HD/Opencode` pelo diretório que deseja sempre abrir o Opencode.


## opencode.json

Na raiz do diretório onde você vai abrir o Opencode:

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

**Sem build automático:** `build.disable: true` impede que ele execute scripts de compilação sem supervisão.

**Permissões manuais:** com `edit: ask` e `bash: ask`, cada modificação ou comando passa por você antes de rodar.

**Plan mode como default:** `--agent plan` faz ele primeiro ler e propor um plano antes de qualquer alteração.

Com esses ajustes, você ganha um sandboxing básico sem precisar de container. É uma camada extra de segurança que não atrapalha o fluxo.

## Links

**Opencode:** [opencode.ai](https://opencode.ai)

---

`$ echo "até logo"` 