# Установка sshpass для автоматического развертывания

## macOS

```bash
brew install hudochenkov/sshpass/sshpass
```

## После установки sshpass

Запустите скрипт развертывания:

```bash
cd /Users/sergeykalinin/Desktop/eSim
./deploy-to-server.sh
```

## Альтернатива: Ручное подключение

Если не хотите устанавливать sshpass, подключитесь вручную:

```bash
ssh root@37.60.228.11
# Пароль: z67FPwBMJlfWg8LVzG5
```

Затем выполните на сервере:

```bash
bash <(curl -s https://raw.githubusercontent.com/come2me2/eSIMsData/main/install.sh)
```

