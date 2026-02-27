"""Pybricks API documentation reference for Spike Prime."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class ApiMethod(BaseModel):
    name: str
    signature: str
    description: str
    parameters: List[dict] = []
    returns: str = ""
    example: str = ""


class ApiClass(BaseModel):
    name: str
    module: str
    description: str
    constructor: str = ""
    methods: List[ApiMethod] = []


# Pybricks API documentation for Spike Prime
SPIKE_PRIME_API: List[ApiClass] = [
    ApiClass(
        name="PrimeHub",
        module="pybricks.hubs",
        description="LEGO SPIKE Prime Hub. Provides access to the hub's built-in devices.",
        constructor="PrimeHub()",
        methods=[
            ApiMethod(
                name="light.on",
                signature="hub.light.on(color)",
                description="Turn on the hub's status light with the given color.",
                parameters=[{"name": "color", "type": "Color", "description": "Color of the light (e.g., Color.RED)"}],
                example="hub.light.on(Color.GREEN)",
            ),
            ApiMethod(
                name="light.off",
                signature="hub.light.off()",
                description="Turn off the hub's status light.",
            ),
            ApiMethod(
                name="display.image",
                signature="hub.display.image(matrix)",
                description="Display a 5x5 image on the light matrix.",
                parameters=[{"name": "matrix", "type": "list", "description": "5x5 nested list with brightness values (0-100)"}],
            ),
            ApiMethod(
                name="display.text",
                signature="hub.display.text(text, pause=500)",
                description="Display scrolling text on the light matrix.",
                parameters=[
                    {"name": "text", "type": "str", "description": "Text to display"},
                    {"name": "pause", "type": "int", "description": "Pause between characters in ms"},
                ],
            ),
            ApiMethod(
                name="display.off",
                signature="hub.display.off()",
                description="Turn off all pixels on the light matrix.",
            ),
            ApiMethod(
                name="speaker.beep",
                signature="hub.speaker.beep(frequency=500, duration=100)",
                description="Play a beep/tone.",
                parameters=[
                    {"name": "frequency", "type": "int", "description": "Sound frequency in Hz"},
                    {"name": "duration", "type": "int", "description": "Duration in ms"},
                ],
            ),
            ApiMethod(
                name="buttons.pressed",
                signature="hub.buttons.pressed()",
                description="Get set of currently pressed buttons.",
                returns="Set of Button values",
            ),
            ApiMethod(
                name="imu.heading",
                signature="hub.imu.heading()",
                description="Get the heading angle of the hub in degrees.",
                returns="float - heading angle",
            ),
            ApiMethod(
                name="imu.acceleration",
                signature="hub.imu.acceleration()",
                description="Get the acceleration of the hub.",
                returns="tuple (x, y, z) in mm/s²",
            ),
            ApiMethod(
                name="battery.voltage",
                signature="hub.battery.voltage()",
                description="Get the battery voltage.",
                returns="int - voltage in mV",
            ),
            ApiMethod(
                name="battery.current",
                signature="hub.battery.current()",
                description="Get the battery current.",
                returns="int - current in mA",
            ),
        ],
    ),
    ApiClass(
        name="Motor",
        module="pybricks.pupdevices",
        description="Control a motor connected to a hub port.",
        constructor="Motor(port, positive_direction=Direction.CLOCKWISE)",
        methods=[
            ApiMethod(
                name="run",
                signature="motor.run(speed)",
                description="Run the motor at a constant speed (indefinitely).",
                parameters=[{"name": "speed", "type": "int", "description": "Speed in degrees/second"}],
                example="motor.run(500)",
            ),
            ApiMethod(
                name="run_time",
                signature="motor.run_time(speed, time, then=Stop.HOLD, wait=True)",
                description="Run the motor at speed for a given time, then stop.",
                parameters=[
                    {"name": "speed", "type": "int", "description": "Speed in deg/s"},
                    {"name": "time", "type": "int", "description": "Duration in ms"},
                    {"name": "then", "type": "Stop", "description": "What to do after (HOLD/BRAKE/COAST)"},
                    {"name": "wait", "type": "bool", "description": "Wait for completion"},
                ],
            ),
            ApiMethod(
                name="run_angle",
                signature="motor.run_angle(speed, rotation_angle, then=Stop.HOLD, wait=True)",
                description="Run the motor at speed for a given angle.",
                parameters=[
                    {"name": "speed", "type": "int", "description": "Speed in deg/s"},
                    {"name": "rotation_angle", "type": "int", "description": "Angle in degrees"},
                ],
            ),
            ApiMethod(
                name="run_target",
                signature="motor.run_target(speed, target_angle, then=Stop.HOLD, wait=True)",
                description="Run to a specific target angle.",
                parameters=[
                    {"name": "speed", "type": "int", "description": "Speed in deg/s"},
                    {"name": "target_angle", "type": "int", "description": "Target angle in degrees"},
                ],
            ),
            ApiMethod(
                name="stop",
                signature="motor.stop()",
                description="Stop the motor (coast).",
            ),
            ApiMethod(
                name="brake",
                signature="motor.brake()",
                description="Stop the motor (actively brake).",
            ),
            ApiMethod(
                name="hold",
                signature="motor.hold()",
                description="Stop and hold the motor at its current angle.",
            ),
            ApiMethod(
                name="angle",
                signature="motor.angle()",
                description="Get the current angle of the motor.",
                returns="int - angle in degrees",
            ),
            ApiMethod(
                name="speed",
                signature="motor.speed()",
                description="Get the current speed of the motor.",
                returns="int - speed in degrees/second",
            ),
            ApiMethod(
                name="reset_angle",
                signature="motor.reset_angle(angle=0)",
                description="Reset the accumulated rotation angle.",
            ),
        ],
    ),
    ApiClass(
        name="DriveBase",
        module="pybricks.robotics",
        description="Two-wheeled drive base for differential drive robots.",
        constructor="DriveBase(left_motor, right_motor, wheel_diameter, axle_track)",
        methods=[
            ApiMethod(
                name="drive",
                signature="drive_base.drive(speed, turn_rate)",
                description="Drive at given speed and turn rate (indefinitely).",
                parameters=[
                    {"name": "speed", "type": "int", "description": "Speed in mm/s"},
                    {"name": "turn_rate", "type": "int", "description": "Turn rate in deg/s"},
                ],
            ),
            ApiMethod(
                name="straight",
                signature="drive_base.straight(distance, then=Stop.HOLD, wait=True)",
                description="Drive straight for a given distance.",
                parameters=[{"name": "distance", "type": "int", "description": "Distance in mm"}],
            ),
            ApiMethod(
                name="turn",
                signature="drive_base.turn(angle, then=Stop.HOLD, wait=True)",
                description="Turn in place for a given angle.",
                parameters=[{"name": "angle", "type": "int", "description": "Angle in degrees"}],
            ),
            ApiMethod(
                name="curve",
                signature="drive_base.curve(radius, angle, then=Stop.HOLD, wait=True)",
                description="Drive along a curve of given radius for a given angle.",
                parameters=[
                    {"name": "radius", "type": "int", "description": "Radius in mm"},
                    {"name": "angle", "type": "int", "description": "Angle in degrees"},
                ],
            ),
            ApiMethod(
                name="stop",
                signature="drive_base.stop()",
                description="Stop the drive base.",
            ),
            ApiMethod(
                name="distance",
                signature="drive_base.distance()",
                description="Get total distance driven.",
                returns="int - distance in mm",
            ),
            ApiMethod(
                name="angle",
                signature="drive_base.angle()",
                description="Get total angle turned.",
                returns="int - angle in degrees",
            ),
        ],
    ),
    ApiClass(
        name="ColorSensor",
        module="pybricks.pupdevices",
        description="LEGO SPIKE Color Sensor.",
        constructor="ColorSensor(port)",
        methods=[
            ApiMethod(name="color", signature="sensor.color()", description="Get detected color.", returns="Color"),
            ApiMethod(name="reflection", signature="sensor.reflection()", description="Get reflected light intensity.", returns="int (0-100%)"),
            ApiMethod(name="ambient", signature="sensor.ambient()", description="Get ambient light intensity.", returns="int (0-100%)"),
            ApiMethod(name="hsv", signature="sensor.hsv()", description="Get HSV color.", returns="Color with h, s, v"),
        ],
    ),
    ApiClass(
        name="UltrasonicSensor",
        module="pybricks.pupdevices",
        description="LEGO SPIKE Ultrasonic Distance Sensor.",
        constructor="UltrasonicSensor(port)",
        methods=[
            ApiMethod(name="distance", signature="sensor.distance()", description="Get measured distance.", returns="int - distance in mm"),
            ApiMethod(name="presence", signature="sensor.presence()", description="Check if another ultrasonic sensor is nearby.", returns="bool"),
        ],
    ),
    ApiClass(
        name="ForceSensor",
        module="pybricks.pupdevices",
        description="LEGO SPIKE Force Sensor.",
        constructor="ForceSensor(port)",
        methods=[
            ApiMethod(name="force", signature="sensor.force()", description="Get measured force.", returns="float - force in Newtons"),
            ApiMethod(name="distance", signature="sensor.distance()", description="Get deflection distance.", returns="float - distance in mm"),
            ApiMethod(name="pressed", signature="sensor.pressed(force=3)", description="Check if pressed above threshold.", returns="bool"),
            ApiMethod(name="touched", signature="sensor.touched()", description="Check if touched at all.", returns="bool"),
        ],
    ),
]


@router.get("/api-reference", response_model=List[ApiClass])
async def get_api_reference():
    """Get complete Pybricks API reference for Spike Prime."""
    return SPIKE_PRIME_API


@router.get("/api-reference/{class_name}", response_model=ApiClass)
async def get_class_reference(class_name: str):
    """Get API reference for a specific class."""
    for api_class in SPIKE_PRIME_API:
        if api_class.name.lower() == class_name.lower():
            return api_class
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail=f"Class '{class_name}' not found")


@router.get("/modules")
async def list_modules():
    """List all available Pybricks modules for Spike Prime."""
    return {
        "pybricks.hubs": {
            "description": "Hub classes",
            "classes": ["PrimeHub"],
        },
        "pybricks.pupdevices": {
            "description": "Powered Up device classes",
            "classes": ["Motor", "ColorSensor", "UltrasonicSensor", "ForceSensor"],
        },
        "pybricks.parameters": {
            "description": "Parameter constants",
            "enums": ["Port", "Direction", "Stop", "Color", "Button", "Side"],
        },
        "pybricks.robotics": {
            "description": "Robotics classes",
            "classes": ["DriveBase"],
        },
        "pybricks.tools": {
            "description": "Utility tools",
            "classes": ["StopWatch"],
            "functions": ["wait"],
        },
    }
