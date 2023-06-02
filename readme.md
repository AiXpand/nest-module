```typescript
AiXpandModule.register({
    mqtt: {
        protocol: 'mqtt',
        host: '###',
        port: 1883,
        username: '###',
        password: '###',
        session: {
            clean: true,
            clientId: null,
        },
    },
    aixpNamespace: 'lummetry',
    name: 'nest-aixp',
    fleet: [
        'preferred-node',
    ],
    plugins: {},
    options: {
        bufferPayloadsWhileBooting: false,
        cacheType: CacheType.MEMORY,
    }
})
```