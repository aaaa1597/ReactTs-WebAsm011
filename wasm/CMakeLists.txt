cmake_minimum_required(VERSION 3.5)
project(cppmain LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s ALLOW_MEMORY_GROWTH=1 -s USE_ZLIB=1 -s ASSERTIONS=1 -s DISABLE_EXCEPTION_CATCHING=0 --bind -O3 -s LLD_REPORT_UNDEFINED -s DEMANGLE_SUPPORT=1")

include_directories(/usr/local/include/opencv4)

file(GLOB_RECURSE sources1 ifwasm.cpp "../src/MainProcess.cpp")
add_executable(${PROJECT_NAME} ${sources1})

file(GLOB opencv_core "/usr/local/lib/*.a")
file(GLOB opencv_3rdparty "/usr/local/lib/opencv4/3rdparty/*.a")
target_link_libraries(${PROJECT_NAME} ${opencv_core} ${opencv_3rdparty})
