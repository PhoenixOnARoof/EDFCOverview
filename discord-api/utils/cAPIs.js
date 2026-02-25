export async function APICall(route, access_token) {
    try {
        const res = await fetch('https://companion.orerve.net/' + route, {
            headers: { 'Authorization': 'Bearer ' + access_token }
        });

        return await res.json();
    } catch (e) {
        console.log(e);
        return {};
    }
}

export async function profile(access_token) {
    return await APICall('profile', access_token);
}

export async function carrier(access_token) {
    
    const carrierData = await APICall('fleetcarrier', access_token);

    if (carrierData.name?.vanityName) {
        const buffer = Buffer.from(carrierData.name.vanityName, 'hex');
        carrierData.name.name = buffer.toString('utf8');
    }

    return carrierData;

}