
export function preprocessLaTeX(content: string): string {
    let processed = content.replace(/```(?:latex|tex)\s*([\s\S]*?)\s*```/gi, '$1');
    const blockEnvs = [
        'align', 'align\\*', 'equation', 'equation\\*',
        'gather', 'gather\\*', 'matrix', 'pmatrix', 'bmatrix'
    ];

    blockEnvs.forEach(env => {
        const pattern = new RegExp(`(?<!\\$\\$\\s*)\\\\begin\\{${env}\\}([\\s\\S]*?)\\\\end\\{${env}\\}(?!\\s*\\$\\$)`, 'gi');
        processed = processed.replace(pattern, (match) => {
            return `$$\n${match}\n$$`;
        });
    });

    return processed;
}
