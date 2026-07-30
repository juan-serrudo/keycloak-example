# Importación de realms

Este directorio se monta en modo de solo lectura dentro de Keycloak:

```text
/opt/keycloak/data/import
```

Al iniciar, `docker-compose.yml` ejecuta Keycloak con `--import-realm`. Los
archivos JSON válidos de este directorio permiten reconstruir configuración de
forma reproducible.

Una exportación destinada a Git debe revisarse antes de confirmarla:

- No incluir usuarios reales.
- No incluir contraseñas, claves privadas ni secretos de clientes.
- No asumir que la importación sobrescribirá un realm existente; la estrategia
  de inicio ignora normalmente los realms que ya existen.

En una fase posterior se añadirá una exportación saneada del realm `uoit`.
