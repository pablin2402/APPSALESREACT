import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    clientDetailCard: {
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 25,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: -2 },
        shadowRadius: 8,
    },
    modalHandle: {
        width: 60,
        height: 5,
        backgroundColor: '#ccc',
        alignSelf: 'center',
        borderRadius: 3,
        marginBottom: 15,
    },
    clientDetailName: {
        fontSize: 25,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#333',
        textAlign: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoText: {
        marginLeft: 8,
        fontSize: 18,
        color: '#444',
    },
    primaryButton: {
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 15,
    },
    primaryButtonText: {
        color: '#D3423E',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 18,
    },
    terminateButton: {
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 15,
    },
    terminateButtonText: {
        color: '#000',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 18,
    },
    secondaryButton: {
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 10,
        padding: 10,
    },
    secondaryButtonText: {
        color: '#333',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 18,
    },

   
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    map: {
        width: width,
        height: height,
        position: "absolute"

    },
    cardList: {
        position: "absolute",
        bottom: 20,
        left: 0,
        right: 0,
        paddingHorizontal: 10,
    },
    cardsContainer: {
        position: "absolute",
        bottom: 30,
        left: 0,
        right: 0,
        paddingHorizontal: 10,
        zIndex: 2,
    },
    searchInput: {
        position: "absolute",
        top: 60,
        left: 25,
        right: 25,
        zIndex: 1,
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 20,
        fontSize: 16,
        elevation: 5,
    },
    card: {
        width: width * 0.7,
        height: 80,
        marginRight: 10,
        borderRadius: 15,
        overflow: "hidden",
        backgroundColor: "#fff",
        elevation: 5,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cardImage: {
        width: 60,
        height: 60,
        borderRadius: 5,
        marginRight: 10,
        marginLeft: 10
    },
    cardInfo: {
        padding: 5,
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "black",
        marginBottom: 6
    },
    cardTitle2: {
        fontSize: 20,
        fontWeight: "bold",
        color: "black",
        marginBottom: 6,
        marginLeft: 10,
        marginTop: 6
    },
    cardAddressContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
    },
    cardAddress: {
        color: "gray",
        marginLeft: 10,
        marginBottom: 6
    },
    cardsWrapper: {
        position: "absolute",
        bottom: 30,
        width: width,
    },
    cardsContainer: {
        paddingHorizontal: 10,
        zIndex: 2,
    },
    locationIcon: {
        marginRight: 5,
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
    },
    clientDetailCard: {
        position: "absolute",
        left: 20,
        right: 20,
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 15,
        elevation: 5,
        alignItems: "center",
    },
    timerText: {
        fontSize: 18,
        marginVertical: 10,
    },
    redButton: {
        color: "white",
        padding: 10,
        borderRadius: 10,
        width: "70%",
        alignItems: "center",
        marginVertical: 5,
    },
    buttonText2: {
        color: "#D3423E",
        fontSize: 16,
        fontWeight: "bold",
    },
    timerContainer: {
        position: "absolute",
        top: 160,
        left: "50%",
        transform: [{ translateX: -50 }],
        backgroundColor: "green",
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 10,
    },
    timerText: {
        color: "white",
        fontSize: 20,
        fontWeight: "bold",
    },
    startRouteButton: {
        position: "absolute", top: 70, left: 25, right: 25, zIndex: 1, backgroundColor: "#D3423E", padding: 10, borderRadius: 10, alignItems: "center"
    },
    startRouteButton1: {
        position: "absolute", top: 110, left: 25, right: 25, zIndex: 1, backgroundColor: "#D3423E", padding: 10, borderRadius: 25, alignItems: "center"
    },
    startRouteButton2: {
        position: "absolute", top: 110, left: 25, right: 25, zIndex: 1, backgroundColor: "#D3423E", padding: 10, borderRadius: 10, alignItems: "center"
    },
    viewClientsButton: {
        position: "absolute", top: 70, left: 25, right: 25, zIndex: 1, backgroundColor: "#3A3737", padding: 10, borderRadius: 12, alignItems: "center", flex: 1, marginRight: 10,
    },
    buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
    buttonContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 20 },
});

export default styles;
