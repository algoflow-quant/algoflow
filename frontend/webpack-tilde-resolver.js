// Custom webpack plugin to resolve ~ imports in CSS to node_modules
class TildeResolverPlugin {
  apply(resolver) {
    const target = resolver.ensureHook('resolve');

    resolver
      .getHook('described-resolve')
      .tapAsync('TildeResolverPlugin', (request, resolveContext, callback) => {
        if (request.request && request.request.startsWith('~')) {
          const newRequest = {
            ...request,
            request: request.request.substring(1),
          };
          return resolver.doResolve(target, newRequest, null, resolveContext, callback);
        }
        callback();
      });
  }
}

module.exports = TildeResolverPlugin;
