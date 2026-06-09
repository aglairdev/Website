# Plugin Noctalia para mpv via IPC socket

![preview](https://raw.githubusercontent.com/aglairdev/noctalia-plugins/mpv/mpv/preview.png)

Demonstração: [youtube.com/watch?v=uFUVEnid2LM](https://www.youtube.com/watch?v=uFUVEnid2LM)

Uso CachyOS com [Niri](https://github.com/YaLTeR/niri) e [Noctalia](https://noctalia.dev/) como status bar. Para consumir YouTube pelo terminal uso o [yt-x](https://github.com/Benexl/yt-x), que delega a reprodução ao mpv. O Niri organiza janelas em scroll horizontal, e o yt-x não exibe o nome do conteúdo em playlists, só a URL. Precisava de um widget para ver o título e controlar a reprodução sem trocar de janela.

A Noctalia tem o [noctalia-mpd](https://github.com/ido50/noctalia-mpd) de [Ido Perlmuter](https://github.com/ido50), mas ele fala com o mpd via `mpc`. O mpv expõe uma socket Unix com protocolo JSON-IPC, incompatível. Usei o noctalia-mpd como base e reescrevi a camada de comunicação.

Repositório: [aglairdev/noctalia-plugins (branch mpv)](https://github.com/aglairdev/noctalia-plugins/tree/mpv/mpv)

## Protocolo

O mpd tem o `mpc`, que abstrai tudo. Uma chamada devolve estado completo:

```
Artista - Título
[playing] #2/10   0:43/3:12 (22%)
```

O mpv não tem cliente equivalente. Cada propriedade é uma consulta separada na socket:

```sh
echo '{"command":["get_property","media-title"]}' | socat - UNIX-CONNECT:/tmp/mpvsocket
# {"data":"Tame Impala - Let It Happen","error":"success"}

echo '{"command":["get_property","pause"]}' | socat - UNIX-CONNECT:/tmp/mpvsocket
# {"data":false,"error":"success"}
```

Essa diferença é o que motiva todas as mudanças abaixo.

## BarWidget.qml

O mpd resolve tudo em um processo:

```qml
Process {
  command: ["mpc", "status"]
  stdout: StdioCollector {
    onStreamFinished: {
      const lines = this.text.trim().split("\n")
      root.songName  = lines[0]
      root.mpdStatus = lines[1].includes("[playing]") ? "playing" : "paused"
    }
  }
}
```

O mpv exige uma chamada por propriedade, então são dois processos rodando em paralelo:

```qml
Process {
  id: mpvTitleProc
  command: ["sh", "-c", "echo '{\"command\":[\"get_property\",\"media-title\"]}' | socat - UNIX-CONNECT:/tmp/mpvsocket 2>/dev/null"]
  stdout: StdioCollector {
    onStreamFinished: {
      const json = JSON.parse(this.text.trim())
      const data = json.data
      // mpv devolve a URL do watch?v= enquanto carrega; ignora até o título real chegar
      if (data && !data.includes("watch?v=") && !data.startsWith("http"))
        root.rawTitle = data
    }
  }
}

Process {
  id: mpvPauseProc
  command: ["sh", "-c", "echo '{\"command\":[\"get_property\",\"pause\"]}' | socat - UNIX-CONNECT:/tmp/mpvsocket 2>/dev/null"]
  stdout: StdioCollector {
    onStreamFinished: {
      const json = JSON.parse(this.text.trim())
      root.mpvStatus = root.rawTitle
        ? (json.data ? "paused" : "playing")
        : "stopped"
    }
  }
}
```

## Controles

mpd:

```qml
case "next":   return ["mpc", "next"]
case "prev":   return ["mpc", "prev"]
case "toggle": return ["mpc", "toggle"]
case "stop":   return ["mpc", "stop"]
```

mpv, via socket:

```qml
case "next":   return ["sh", "-c", "echo '{\"command\":[\"playlist-next\"]}' | socat - UNIX-CONNECT:/tmp/mpvsocket"]
case "prev":   return ["sh", "-c", "echo '{\"command\":[\"playlist-prev\"]}' | socat - UNIX-CONNECT:/tmp/mpvsocket"]
case "toggle": return ["sh", "-c", "echo '{\"command\":[\"cycle\",\"pause\"]}' | socat - UNIX-CONNECT:/tmp/mpvsocket"]
case "stop":   return ["sh", "-c", "echo '{\"command\":[\"stop\"]}' | socat - UNIX-CONNECT:/tmp/mpvsocket"]
```

## Panel.qml

O mpd acessa tags ID3 diretamente via `mpc`, incluindo cover art embedded:

```qml
command: ["mpc", "-f", "%artist%\t%title%\t%album%\t%file%", "current"]
// capa via mpc readpicture -> /tmp -> file://
```

O mpv não expõe tags por IPC. O `media-title` do YouTube geralmente segue `Artista - Título`, então o parse é feito na string:

```qml
if (raw.includes(" - ")) {
  root.songTitle  = raw.split(" - ")[0].trim()
  root.songArtist = raw.split(" - ")[1].replace(/\s*\(.*$/, "").trim()
}
```

Para a capa, o plugin consulta a propriedade `path`, extrai o `videoId` e usa a API pública de thumbnails do YouTube:

```qml
const match = json.data.match(/[?&]v=([^&]+)/)
if (match) root.videoId = match[1]

// no Image:
source: "https://img.youtube.com/vi/" + root.videoId + "/maxresdefault.jpg"
```

## Settings.qml

O mpd tem ação `shuffle` para controlar o `ashuffle`. Removida, junto com o toggle relacionado:

```qml
// removido:
{ key: "shuffle", name: "Toggle ashuffle" },
{ key: "none",    name: "Do nothing"      },
```

## Ícone de status

mpd exibe o ícone do estado atual. A versão mpv inverte para mostrar a ação disponível:

```qml
// mpd: estado atual
case "playing": return "player-play"
case "paused":  return "player-pause"

// mpv: ação disponível
case "playing": return "player-pause"
case "paused":  return "player-play"
```

## Instalação

`~/.config/mpv/mpv.conf`:

```
input-ipc-server=/tmp/mpvsocket
```

Copie o plugin para a pasta de plugins da Noctalia, reinicie e habilite nas configurações. O `socat` precisa estar no `$PATH`.

## Links

**Repositório:** [aglairdev/noctalia-plugins (branch mpv)](https://github.com/aglairdev/noctalia-plugins/tree/mpv/mpv)
**Baseado em:** [noctalia-mpd](https://github.com/ido50/noctalia-mpd) por [Ido Perlmuter](https://github.com/ido50)
**yt-x:** [github.com/Benexl/yt-x](https://github.com/Benexl/yt-x)
**Noctalia:** [noctalia.dev](https://noctalia.dev/)

---

`$ echo "até logo"` 