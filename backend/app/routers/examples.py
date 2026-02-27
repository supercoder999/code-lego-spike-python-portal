"""Example programs for LEGO Spike Prime with Pybricks."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class Example(BaseModel):
    id: str
    name: str
    description: str
    category: str
    python_code: str
    difficulty: str  # beginner, intermediate, advanced


EXAMPLES: List[Example] = [
    Example(
        id="hello_hub",
        name="Hello Hub",
        description="Initialize the hub, display a smiley, and beep",
        category="Getting Started",
        difficulty="beginner",
        python_code="""from pybricks.hubs import PrimeHub
from pybricks.parameters import Color
from pybricks.tools import wait

# Initialize the hub
hub = PrimeHub()

# Set the light to green
hub.light.on(Color.GREEN)

# Display a smiley face
hub.display.image([
    [100, 0, 0, 0, 100],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [100, 0, 0, 0, 100],
    [0, 100, 100, 100, 0],
])

# Wait 3 seconds
wait(3000)

# Beep!
hub.speaker.beep()
""",
    ),
    Example(
        id="single_motor",
        name="Single Motor Control",
        description="Control a single motor on Port A",
        category="Motors",
        difficulty="beginner",
        python_code="""from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Stop
from pybricks.tools import wait

hub = PrimeHub()

# Initialize a motor on Port A
motor = Motor(Port.A)

# Run at 500 degrees per second for 2 seconds
motor.run_time(500, 2000)

# Wait a moment
wait(500)

# Run backwards for 360 degrees
motor.run_angle(-500, 360)

# Wait a moment
wait(500)

# Run to the 0 degree position
motor.run_target(500, 0)

print("Done!")
""",
    ),
    Example(
        id="drive_base",
        name="DriveBase - Move and Turn",
        description="Drive a robot with two motors using DriveBase",
        category="Movement",
        difficulty="beginner",
        python_code="""from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction
from pybricks.robotics import DriveBase
from pybricks.tools import wait

hub = PrimeHub()

# Initialize motors
left_motor = Motor(Port.A)
right_motor = Motor(Port.B, Direction.COUNTERCLOCKWISE)

# Create DriveBase
# Adjust wheel_diameter and axle_track for your robot
drive_base = DriveBase(left_motor, right_motor, wheel_diameter=56, axle_track=114)

# Drive forward 300mm
drive_base.straight(300)
wait(500)

# Turn right 90 degrees
drive_base.turn(90)
wait(500)

# Drive forward 300mm
drive_base.straight(300)
wait(500)

# Turn right 90 degrees
drive_base.turn(90)
wait(500)

# Drive back to start
drive_base.straight(300)
wait(500)

drive_base.turn(90)
wait(500)

drive_base.straight(300)

drive_base.stop()
print("Square complete!")
""",
    ),
    Example(
        id="color_sensor",
        name="Color Sensor",
        description="Read colors and reflected light with the color sensor",
        category="Sensors",
        difficulty="beginner",
        python_code="""from pybricks.hubs import PrimeHub
from pybricks.pupdevices import ColorSensor
from pybricks.parameters import Port, Color
from pybricks.tools import wait

hub = PrimeHub()

# Initialize color sensor on Port C
color_sensor = ColorSensor(Port.C)

# Read colors for 10 seconds
for i in range(20):
    # Get the detected color
    color = color_sensor.color()
    
    # Get the reflected light intensity (0-100%)
    reflection = color_sensor.reflection()
    
    print("Color:", color, "Reflection:", reflection, "%")
    
    # Change hub light based on detected color
    if color == Color.RED:
        hub.light.on(Color.RED)
    elif color == Color.GREEN:
        hub.light.on(Color.GREEN)
    elif color == Color.BLUE:
        hub.light.on(Color.BLUE)
    elif color == Color.YELLOW:
        hub.light.on(Color.YELLOW)
    else:
        hub.light.on(Color.WHITE)
    
    wait(500)

print("Done!")
""",
    ),
    Example(
        id="ultrasonic_sensor",
        name="Ultrasonic Distance Sensor",
        description="Measure distance and avoid obstacles",
        category="Sensors",
        difficulty="intermediate",
        python_code="""from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, UltrasonicSensor
from pybricks.parameters import Port, Direction, Color
from pybricks.robotics import DriveBase
from pybricks.tools import wait

hub = PrimeHub()

# Initialize sensors and motors
ultrasonic = UltrasonicSensor(Port.D)
left_motor = Motor(Port.A)
right_motor = Motor(Port.B, Direction.COUNTERCLOCKWISE)
drive_base = DriveBase(left_motor, right_motor, wheel_diameter=56, axle_track=114)

# Simple obstacle avoidance
print("Starting obstacle avoidance...")

for i in range(100):
    distance = ultrasonic.distance()
    print("Distance:", distance, "mm")
    
    if distance < 150:
        # Obstacle detected! Stop and turn
        hub.light.on(Color.RED)
        drive_base.stop()
        wait(200)
        
        # Back up a bit
        drive_base.straight(-100)
        
        # Turn right
        drive_base.turn(90)
    else:
        # Clear path - drive forward
        hub.light.on(Color.GREEN)
        drive_base.drive(200, 0)
    
    wait(100)

drive_base.stop()
print("Done!")
""",
    ),
    Example(
        id="button_control",
        name="Button Control",
        description="Control the robot using hub buttons",
        category="Input",
        difficulty="beginner",
        python_code="""from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Button, Color
from pybricks.tools import wait

hub = PrimeHub()

# Initialize a motor on Port A
motor = Motor(Port.A)

print("Press LEFT to run forward")
print("Press RIGHT to run backward")
print("Press both to exit")

while True:
    pressed = hub.buttons.pressed()
    
    if Button.LEFT in pressed and Button.RIGHT in pressed:
        # Both buttons - exit
        motor.stop()
        hub.light.on(Color.RED)
        print("Exiting!")
        break
    elif Button.LEFT in pressed:
        # Left button - run forward
        hub.light.on(Color.GREEN)
        motor.run(500)
    elif Button.RIGHT in pressed:
        # Right button - run backward
        hub.light.on(Color.BLUE)
        motor.run(-500)
    else:
        # No button - stop
        hub.light.on(Color.WHITE)
        motor.stop()
    
    wait(50)
""",
    ),
    Example(
        id="line_follower",
        name="Line Follower",
        description="Follow a black line using the color sensor",
        category="Advanced",
        difficulty="intermediate",
        python_code="""from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor
from pybricks.parameters import Port, Direction, Color
from pybricks.robotics import DriveBase
from pybricks.tools import wait

hub = PrimeHub()

# Initialize
color_sensor = ColorSensor(Port.C)
left_motor = Motor(Port.A)
right_motor = Motor(Port.B, Direction.COUNTERCLOCKWISE)
drive_base = DriveBase(left_motor, right_motor, wheel_diameter=56, axle_track=114)

# PID Controller parameters
# Adjust these for your robot and line
THRESHOLD = 50      # Reflection threshold (between black and white)
BASE_SPEED = 150    # Base driving speed (mm/s)
KP = 2.0           # Proportional gain
KI = 0.01          # Integral gain  
KD = 1.0           # Derivative gain

# PID state
integral = 0
last_error = 0

hub.light.on(Color.GREEN)
print("Starting line follower...")
print("Place the sensor on the edge of the line")

for i in range(2000):  # Run for ~2000 iterations
    # Read sensor
    reflection = color_sensor.reflection()
    
    # Calculate error (positive = too far right on white)
    error = reflection - THRESHOLD
    
    # PID calculation
    integral = integral + error
    derivative = error - last_error
    
    # Limit integral windup
    integral = max(-1000, min(1000, integral))
    
    # Calculate correction
    correction = KP * error + KI * integral + KD * derivative
    
    # Apply correction to drive base
    drive_base.drive(BASE_SPEED, correction)
    
    last_error = error
    wait(10)

drive_base.stop()
print("Done!")
""",
    ),
    Example(
        id="force_sensor",
        name="Force Sensor Control",
        description="Use the force sensor to control motor speed",
        category="Sensors",
        difficulty="intermediate",
        python_code="""from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ForceSensor
from pybricks.parameters import Port, Color
from pybricks.tools import wait

hub = PrimeHub()

# Initialize devices
force_sensor = ForceSensor(Port.D)
motor = Motor(Port.A)

print("Press the force sensor to control motor speed")
print("Press harder = faster rotation")
print("Press hub center button to exit")

hub.light.on(Color.GREEN)

while True:
    # Read force (0 to ~10 Newtons)
    force = force_sensor.force()
    
    if force_sensor.pressed():
        # Map force (0-10N) to speed (0-1000 deg/s)
        speed = int(force * 100)
        motor.run(speed)
        
        # Change light color based on force
        if force > 7:
            hub.light.on(Color.RED)
        elif force > 4:
            hub.light.on(Color.YELLOW)
        else:
            hub.light.on(Color.GREEN)
        
        print("Force:", round(force, 1), "N  Speed:", speed, "deg/s")
    else:
        motor.stop()
        hub.light.on(Color.WHITE)
    
    wait(50)
""",
    ),
    Example(
        id="display_animation",
        name="Display Animation",
        description="Create animations on the 5x5 LED matrix",
        category="Display",
        difficulty="beginner",
        python_code="""from pybricks.hubs import PrimeHub
from pybricks.tools import wait

hub = PrimeHub()

# Define animation frames (5x5 grid, values 0-100)
frames = [
    # Frame 1: Heart small
    [
        [0, 100, 0, 100, 0],
        [100, 0, 100, 0, 100],
        [100, 0, 0, 0, 100],
        [0, 100, 0, 100, 0],
        [0, 0, 100, 0, 0],
    ],
    # Frame 2: Heart big
    [
        [0, 100, 0, 100, 0],
        [100, 100, 100, 100, 100],
        [100, 100, 100, 100, 100],
        [0, 100, 100, 100, 0],
        [0, 0, 100, 0, 0],
    ],
]

# Play animation loop
print("Playing heart animation...")
for i in range(20):
    for frame in frames:
        hub.display.image(frame)
        wait(300)

# Show happy face
hub.display.image([
    [100, 0, 0, 0, 100],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [100, 0, 0, 0, 100],
    [0, 100, 100, 100, 0],
])
wait(2000)

hub.display.off()
print("Done!")
""",
    ),
]


@router.get("/", response_model=List[Example])
async def list_examples():
    """List all available example programs."""
    return EXAMPLES


@router.get("/categories")
async def list_categories():
    """List all example categories."""
    categories = sorted(set(e.category for e in EXAMPLES))
    return categories


@router.get("/category/{category}", response_model=List[Example])
async def get_examples_by_category(category: str):
    """Get examples by category."""
    return [e for e in EXAMPLES if e.category.lower() == category.lower()]


@router.get("/{example_id}", response_model=Example)
async def get_example(example_id: str):
    """Get a specific example by ID."""
    for example in EXAMPLES:
        if example.id == example_id:
            return example
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Example not found")
