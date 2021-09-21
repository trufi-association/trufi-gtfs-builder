module.exports = function readmeGenerator(data) {
    let route_with_error = 0
    let out_file = `
| Id | Name | Ref | From | To | State |
| -- | ---- | --- | ---- | -- | ----- |`
    data.log.forEach(element => {
        const tags = element.tags
        if (element.error) route_with_error++
        const state = element.error ? element.error.extractor_error ? `[${element.error.extractor_error}](${element.error.uri})` : element.error : "✅"
        out_file += `\n[${element.id}](https://www.openstreetmap.org/relation/${element.id}) | ${tags.name} | ${tags.ref} | ${tags.from} | ${tags.to} | ${state}`
    });
    const response = `### Count
**Total**: ${data.log.length}  **Correct**: ${data.log.length - route_with_error}  **With error**: ${route_with_error}

${out_file}`
    return response;
}