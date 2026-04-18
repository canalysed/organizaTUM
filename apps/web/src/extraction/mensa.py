import requests
from datetime import date, datetime

BASE_URL = "https://tum-dev.github.io/eat-api/en"

def get_all_canteens():
    """Returns a list of all available canteens."""
    url = f"{BASE_URL}/enums/canteens.json"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

def get_menu_week(canteen_id: str, year: int, week: int):
    """Returns the menu of a canteen for a specific week."""
    url = f"{BASE_URL}/{canteen_id}/{year}/{week:02d}.json"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

def get_menu_day(canteen_id: str, target_date: date):
    """Returns the menu of a canteen for a specific date.
    
    Args:
        canteen_id: ID of the canteen
        target_date: Date to get menu for (date object)
    
    Returns:
        Dictionary with the day's menu, or None if not found
    """
    year, week, _ = target_date.isocalendar()
    menu_week = get_menu_week(canteen_id, year, week)
    
    target_str = target_date.strftime("%Y-%m-%d")
    
    for day_data in menu_week.get("days", []):
        if day_data.get("date") == target_str:
            return day_data
    return None


