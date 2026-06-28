+++
date = '2026-06-27T19:05:00+05:30'
draft = false
title = 'Stop Deleting Virtual Environments'
+++
If you are a python dev, you sure have been in quite a hassle in deleting virtual environments when your system python version got an upgrade. Like your project was using python 3.13 and now the system has got upgraded so, the current python version is 3.14.

But when you go to your venv and activate it, you see you can't access those 3rd party libraries anymore you installed as dependencies. Because your system python version got upgraded you can't use the virtual environment that was using the older python version. Now if you had a requirements.txt file prepared, you can delete the venv folder and create a new fresh venv directory for the current python version. But still installing **numerous** packages or a relatively small number of dependencies but very heavy (like tensorflow[and-cuda],pytorch,etc.), can take a huge amount of time (also depending on the internet speeds).

And if you forgot to keep a requirements.txt file, oh boy, now even if you type the command(`pip freeze`) it is not gonna work because the python version the old pip depends on is not there anymore.

**So what should you do now?**
You can either check out the open source python tool called [pyEnv](https://github.com/pyenv/pyenv). This lets you manage multiple versions of python binary in your system. This is the go-to choice of many python software developers. So I think you should at least know about it even if you don't find it your best option considering your workflow.

More resources online for learning pyEnv:
- [Intro to PyEnv - Real Python](https://realpython.com/intro-to-pyenv/)
- [Calm the Chaos of Your Python Environment with PyEnv](https://learningnetwork.cisco.com/s/blogs/a0D6e00000snzA2EAI/calm-the-chaos-of-your-python-environment-with-pyenv)

{{< linkcard "https://github.com/pyenv" >}}

But honestly, although `pyEnv` is good (like really good), but I think pip itself needs a boost or glow up. That package manager is slow and when you install a large enough package, you feel its toll. It takes one eternity to install them.

Soooo? I guess you got me. I am selling you `uv`. UV has a ton of different commands, and it is a complete project manager, not just a package manager. Hell, even the speeds are amazing!

{{<  linkcard "https://github.com/astral-sh/uv"  >}}

Check it out! Once you try **uv**, you never look back again.

## HOW TO INSTALL UV IN YOUR SYSTEM

If you use void linux (like me!!!), installing uv is a breeze. Install it easily with xbps -
```sh
sudo xbps-install -S uv
```
If you use any other linux OS(or maybe macOS), I recommend you follow the instructions on the website. That is, using curl to install it -
```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
```
or if you are using windows -
```pwsh
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

> | :bulb: NOTE |
|-----------|
You can also install it using homebrew, wget or winget, if you prefer.


## HOW TO USE UV TO MANAGE MULTIPLE PYTHON VERSIONS

You can install a different python version than the one currently installed on your system with uv. To do so - run
```sh
uv python install <version>
```
For example, you can install python 3.10 by running -
```sh
uv python install 3.10
```

This command will install that particluar python version in your `~/.local/share` directory.
How cool & easy is that!
You can pin a different python version for default cases by running the uv python pin command. For example I prefer uv to pick python 3.12 by default, so I would run -
```sh
uv python pin 3.12
```

See? Easy!

One more thing, if you are starting a new python project, and want to use the `uv` managed python binaries in there rather than the system's deafult python version, initialize your project with -
```sh
uv --managed python init
```

Whenever you need to search something, instead of going to google search or chatgpt, first you should search in your system with -
```sh
uv --help
```
It prints like this -
```bash
An extremely fast Python package manager.

Usage: uv [OPTIONS] <COMMAND>

Commands:
  auth     Manage authentication
  run      Run a command or script
  init     Create a new project
  add      Add dependencies to the project
  remove   Remove dependencies from the project
  version  Read or update the project's version
  sync     Update the project's environment
  lock     Update the project's lockfile
  export   Export the project's lockfile to an alternate format
  tree     Display the project's dependency tree
  format   Format Python code in the project
  tool     Run and install commands provided by Python packages
  python   Manage Python versions and installations
  pip      Manage Python packages with a pip-compatible interface
  venv     Create a virtual environment
  build    Build Python packages into source distributions and wheels
  publish  Upload distributions to an index
  cache    Manage uv's cache
  self     Manage the uv executable
  help     Display documentation for a command

Cache options:
  -n, --no-cache               Avoid reading from or writing to the cache, instead using a temporary directory for the duration of the operation [env: UV_NO_CACHE=]
      --cache-dir <CACHE_DIR>  Path to the cache directory [env: UV_CACHE_DIR=]

Python options:
      --managed-python       Require use of uv-managed Python versions [env: UV_MANAGED_PYTHON=]
      --no-managed-python    Disable use of uv-managed Python versions [env: UV_NO_MANAGED_PYTHON=]
      --no-python-downloads  Disable automatic downloads of Python. [env: "UV_PYTHON_DOWNLOADS=never"]

Global options:
  -q, --quiet...                                   Use quiet output
  -v, --verbose...                                 Use verbose output
      --color <COLOR_CHOICE>                       Control the use of color in output [possible values: auto, always, never]
      --native-tls                                 Whether to load TLS certificates from the platform's native certificate store [env: UV_NATIVE_TLS=]
      --offline                                    Disable network access [env: UV_OFFLINE=]
      --allow-insecure-host <ALLOW_INSECURE_HOST>  Allow insecure connections to a host [env: UV_INSECURE_HOST=]
      --no-progress                                Hide all progress outputs [env: UV_NO_PROGRESS=]
      --directory <DIRECTORY>                      Change to the given directory prior to running the command [env: UV_WORKING_DIR=]
      --project <PROJECT>                          Discover a project in the given directory [env: UV_PROJECT=]
      --config-file <CONFIG_FILE>                  The path to a `uv.toml` file to use for configuration [env: UV_CONFIG_FILE=]
      --no-config                                  Avoid discovering configuration files (`pyproject.toml`, `uv.toml`) [env: UV_NO_CONFIG=]
  -h, --help                                       Display the concise help for this command
  -V, --version                                    Display the uv version

Use `uv help` for more details.
```

When you need to search about a particular command. Search with  -
```bash
uv help <subcommand>
```
For example if you want to know about how to install managed python versions - you can run - `uv help python uninstall`, to get to know about it.

This article ends here. I hope you found the information helpful.
I document my learnings and ideas in my blog to save and store them and write with little humor (if possible) to share them with you.

## Concluding
I hope you learnt something new and liked reading this piece of text.

Now, if you found this article helpful, if this blog added some value to your time and energy, please show some love by giving the article some likes and share it with your dev friends.

Feel free to connect with me. :)

| Thanks for reading! 🙏🏻 <br/> Written with 💚 by [Debajyati Dey](https://dev.to/ddebajyati) | [![My GitHub](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0tu7kfqhw7z1yzmng4ah.png)](https://github.com/Debajyati) | [![My LinkedIn](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/emp5sh8d4fq0g89lqsia.png)](https://www.linkedin.com/in/debajyati-dey/) | [![My Daily.dev](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/20akag0pdeq95u76k9e8.png)](https://app.daily.dev/debajyatidey) | [![My Peerlist](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/lscfsnjdwyhm803f7mlv.png)](https://peerlist.io/debajyati) | [![My Twitter](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0265bz6hmdfybuw0a605.png)](https://x.com/ddebajyati) |
|-----|------|-----|-----|-----|-----|-----|

Follow me on Dev to motivate me so that I can bring more such tutorials like this on here!


Happy coding 🧑🏽‍💻👩🏽‍💻! Have a nice day ahead! 🚀
