import { eq } from "drizzle-orm";
import db from "../db";
import { frontier } from "../db/schema";
import { fetchCapi } from "./oauth";
import { getCached } from "./redis";

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

export async function getCommander(access_token, frontier_id) {

    const cacheKey = `profile:${frontier_id}`;

    return getCached(cacheKey, async () => {

        const profileData = await fetchCapi('profile', access_token);

        if (profileData) {

            await db
                .update(frontier)
                .set({
                    shipName: profileData.ship?.shipName,
                    cmdrName: profileData.commander?.name,
                    credits: profileData.commander?.credits
                })
                .where(eq(frontier.id, frontier_id));

            return profileData;

        } else
            return {};

    })

}

export async function getCarrier(access_token, frontier_id) {

    const cacheKey = `fleetcarrier:${frontier_id}`;

    return getCached(cacheKey, async () => {

        const carrierData = await fetchCapi('fleetcarrier', access_token);

        if (carrierData) {

            let carrierName = null;
            if (carrierData.name?.vanityName) {

                const buffer = Buffer.from(carrierData.name.vanityName, 'hex');
                carrierName = buffer.toString('utf-8');

                // Assign to Original
                carrierData.name.name = carrierName;
            }

            await db
                .update(frontier)
                .set({
                    carrierName: carrierName,
                    carrierId: carrierData.name?.callsign
                })
                .where(eq(frontier.id, frontier_id));

            return carrierData;

        } else
            return {};

    })

}