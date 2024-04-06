export async function AuthorizedRequest(url: string, token: string) {
    const res = await fetch(url, {
        headers: { Authorization: `Bot ${token}` }
    });
    return await res.json();
};

export async function UnauthorizedRequest(url: string): Promise<any> {
    const res = await fetch(url);
    return await res.json();
};