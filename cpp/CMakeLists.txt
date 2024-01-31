cmake_minimum_required(VERSION 3.5)
project(OpenCVExample)

set(CMAKE_CXX_STANDARD 17)

# OpenCVのパッケージを見つける
find_package(OpenCV REQUIRED)

# #OpenCV関係のインクルードディレクトリのパスを設定
# include_directories( ${OpenCV_INCLUDE_DIRS} )

# ソースファイルを指定
set(SOURCES ifcpp.cpp ../src/MainProcess.cpp)

# 実行可能ファイルをビルド
add_executable(OpenCVExample ${SOURCES})

message('----------------s')
message(${SOURCES})
message(${OpenCV_LIBS})
message('----------------e')

# OpenCVをリンク
target_link_libraries(OpenCVExample ${OpenCV_LIBS})
