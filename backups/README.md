# Respaldos locales

Este directorio está reservado para respaldos de PostgreSQL y exportaciones
operativas de Keycloak.

Los respaldos pueden contener usuarios, correo electrónico, hashes,
configuración sensible o secretos. Por ese motivo, `.gitignore` excluye todo el
contenido de este directorio excepto este documento.

Un respaldo no se considera válido hasta haber probado su restauración. No
ejecutar `docker compose down -v`, eliminar el volumen o reemplazar la base de
datos sin contar con un respaldo verificado.
