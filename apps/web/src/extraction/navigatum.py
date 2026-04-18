import requests

NAVIGATUM_URL = "https://nav.tum.de"

def get_base_infos(room_id: str):
    """Returns the campus/building info for a given room ID."""
    url = f"{NAVIGATUM_URL}/api/locations/{room_id}"
    response = requests.get(url, params={"lang": "en"})
    response.raise_for_status()
    data = response.json()

    return {
        "room": data.get("name"),
        "parents": data.get("parents"),        # list of parent IDs
        "parent_names": data.get("parent_names"),  # list of parent names (readable)
        "type": data.get("type"),
    }

def get_room (room_id: str):
    base_infos = get_base_infos(room_id)
    return base_infos["room"]

def get_campus(room_id: str):
    base_infos = get_base_infos(room_id)
    return base_infos['parent_names'][1]

